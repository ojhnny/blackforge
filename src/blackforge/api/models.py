"""Request and response shapes for the HTTP API (core models are reused as-is)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from blackforge.core.schemas import (
    BugCategory,
    Finding,
    PatchAttempt,
    PatchResult,
    RefereeResult,
    StoredRun,
)


class RunCreate(BaseModel):
    repo_id: str
    mode: Literal["full", "discover_only", "verify_existing"] = "full"
    categories: list[BugCategory] | None = None
    prefer_docker: bool | None = Field(
        default=None,
        description="Run tests in Docker when available. Defaults to the server setting.",
    )


class FindingDetail(BaseModel):
    finding: Finding
    referee: RefereeResult | None = None
    referee_history: list[RefereeResult] = Field(default_factory=list)
    patch: PatchAttempt | None = None
    patch_result: PatchResult | None = None


class RunSummary(BaseModel):
    findings: int = 0
    verified: int = 0
    rejected: int = 0
    patches_attempted: int = 0
    patches_accepted: int = 0
    regressions_introduced: int = 0
    tests_executed: int = 0


class RunDetail(BaseModel):
    run: StoredRun
    findings: list[FindingDetail]
    summary: RunSummary


class Metrics(BaseModel):
    """Aggregates computed from stored executable outcomes, never hard-coded."""

    runs: int
    findings: int
    referee_calls: int
    verified: int
    reproduction_rate: float | None
    patches_attempted: int
    patches_accepted: int
    patch_success_rate: float | None
    regression_rate: float | None
    mean_verification_calls: float | None


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    version: str
    docker_available: bool
