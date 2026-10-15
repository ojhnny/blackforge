"""Pydantic schemas for findings, referee results, and patches."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


class BugCategory(str, Enum):
    PYTHON_LOGIC = "python_logic"
    DATA_SQL = "data_sql"
    ML_PIPELINE = "ml_pipeline"
    API = "api"
    CONFIG = "config"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RefereeVerdict(str, Enum):
    VERIFIED_BUG = "verified_bug"
    NOT_REPRODUCED = "not_reproduced"
    INVALID_TEST = "invalid_test"
    INCONCLUSIVE = "inconclusive"


class Finding(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("BF"))
    category: BugCategory
    file: str
    function_or_query: str | None = None
    location: str | None = None
    description: str
    triggering_input: str
    expected_behavior: str
    observed_behavior: str
    reproduction_steps: list[str] = Field(default_factory=list)
    generated_test: str
    test_path: str | None = None
    severity: Severity = Severity.MEDIUM
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    run_id: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)


class RefereeResult(BaseModel):
    finding_id: str
    reproduced: bool
    evidence: str
    execution_output: str
    expected_behavior: str
    observed_behavior: str
    verdict: RefereeVerdict
    confidence: float = Field(ge=0.0, le=1.0)
    return_code: int | None = None
    duration_ms: int | None = None
    created_at: datetime = Field(default_factory=_utcnow)


class PatchAttempt(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("patch"))
    finding_id: str
    files_modified: list[str]
    patch: str
    explanation: str
    tests_added_or_modified: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_utcnow)


class PatchResult(BaseModel):
    finding_id: str
    patch_id: str
    attack_test_passed: bool
    regression_tests_passed: bool
    static_checks_passed: bool
    new_failures: list[str] = Field(default_factory=list)
    patch_applied: bool = True
    regression_passed: int = 0
    regression_total: int = 0
    patch_accepted: bool
    rejection_reason: str | None = None
    execution_output: str = ""
    created_at: datetime = Field(default_factory=_utcnow)


class ExecutionResult(BaseModel):
    """Raw result from running a command in an isolated environment."""

    command: list[str]
    return_code: int
    stdout: str
    stderr: str
    duration_ms: int
    backend: Literal["docker", "local"]
    workdir: str


StageId = Literal["analyze", "discover", "reproduce", "patch", "verify"]
STAGE_IDS: tuple[StageId, ...] = ("analyze", "discover", "reproduce", "patch", "verify")


class StageRecord(BaseModel):
    id: StageId
    status: Literal["pending", "active", "done", "skipped", "failed"] = "pending"
    detail: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None


class StoredRun(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("run"))
    repo_path: str
    repo_id: str | None = None
    mode: Literal["full", "discover_only", "verify_existing"] = "full"
    status: Literal[
        "created", "running", "reproducing", "completed", "failed", "cancelled"
    ] = "created"
    stages: list[StageRecord] = Field(
        default_factory=lambda: [StageRecord(id=stage) for stage in STAGE_IDS]
    )
    finding_ids: list[str] = Field(default_factory=list)
    patch_ids: list[str] = Field(default_factory=list)
    finding_id: str | None = None
    referee_result_id: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    completed_at: datetime | None = None


class RunEvent(BaseModel):
    """One append-only record of something that happened during a run."""

    run_id: str
    seq: int = 0
    type: Literal[
        "run_started",
        "stage_started",
        "stage_completed",
        "stage_skipped",
        "log",
        "run_completed",
        "run_failed",
        "run_cancelled",
    ]
    stage: StageId | None = None
    message: str = ""
    created_at: datetime = Field(default_factory=_utcnow)

    @property
    def terminal(self) -> bool:
        return self.type in {"run_completed", "run_failed", "run_cancelled"}
