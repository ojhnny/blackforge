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


class StoredRun(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("run"))
    repo_path: str
    status: Literal["created", "reproducing", "completed", "failed"] = "created"
    finding_id: str | None = None
    referee_result_id: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    completed_at: datetime | None = None
