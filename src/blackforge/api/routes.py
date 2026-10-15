"""HTTP routes: repos, runs (with live events), findings, metrics."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from blackforge import __version__
from blackforge.agents.referee import Referee
from blackforge.api.jobs import RunManager
from blackforge.api.models import (
    FindingDetail,
    Health,
    Metrics,
    RunCreate,
    RunDetail,
    RunSummary,
)
from blackforge.api.sse import stream_run_events
from blackforge.core.config import Settings
from blackforge.core.schemas import RefereeResult, RefereeVerdict, StoredRun
from blackforge.core.storage import Storage
from blackforge.core.targets import TargetRepo, list_targets, resolve_target
from blackforge.execution.docker_runner import DockerRunner

router = APIRouter(prefix="/api")


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _storage(request: Request) -> Storage:
    return request.app.state.storage


def _jobs(request: Request) -> RunManager:
    return request.app.state.jobs


def _finding_detail(storage: Storage, finding_id: str) -> FindingDetail | None:
    finding = storage.get_finding(finding_id)
    if finding is None:
        return None
    history = storage.list_referee_results(finding_id)
    patches = storage.list_patch_attempts(finding_id)
    results = storage.list_patch_results(finding_id)
    return FindingDetail(
        finding=finding,
        referee=history[0] if history else None,
        referee_history=history,
        patch=patches[0] if patches else None,
        patch_result=results[0] if results else None,
    )


def _summarize(findings: list[FindingDetail]) -> RunSummary:
    summary = RunSummary(findings=len(findings))
    for item in findings:
        if item.referee is not None:
            summary.tests_executed += 1
            if item.referee.verdict == RefereeVerdict.VERIFIED_BUG:
                summary.verified += 1
            else:
                summary.rejected += 1
        if item.patch is not None:
            summary.patches_attempted += 1
        if item.patch_result is not None:
            summary.tests_executed += 1 + item.patch_result.regression_total
            summary.patches_accepted += int(item.patch_result.patch_accepted)
            summary.regressions_introduced += len(item.patch_result.new_failures)
    return summary


def _run_or_404(storage: Storage, run_id: str) -> StoredRun:
    run = storage.get_run(run_id)
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"run {run_id} not found")
    return run


@router.get("/health", response_model=Health)
def health(request: Request) -> Health:
    return Health(
        version=__version__,
        docker_available=DockerRunner(_settings(request)).available(),
    )


@router.get("/repos", response_model=list[TargetRepo])
def repos(request: Request) -> list[TargetRepo]:
    return list_targets(_settings(request))


@router.post("/runs", response_model=StoredRun, status_code=status.HTTP_202_ACCEPTED)
def create_run(body: RunCreate, request: Request) -> StoredRun:
    settings = _settings(request)
    repo_path = resolve_target(body.repo_id, settings)
    if repo_path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown repo {body.repo_id}")
    target = next(t for t in list_targets(settings) if t.id == body.repo_id)
    run = StoredRun(repo_path=target.path, repo_id=body.repo_id, mode=body.mode)
    return _jobs(request).submit(run, repo_path, body.categories, body.prefer_docker)


@router.get("/runs", response_model=list[StoredRun])
def list_runs(request: Request, limit: int = 50) -> list[StoredRun]:
    return _storage(request).list_runs(limit=limit)


@router.get("/runs/{run_id}", response_model=RunDetail)
def get_run(run_id: str, request: Request) -> RunDetail:
    storage = _storage(request)
    run = _run_or_404(storage, run_id)
    findings = [
        detail
        for detail in (_finding_detail(storage, fid) for fid in run.finding_ids)
        if detail is not None
    ]
    return RunDetail(run=run, findings=findings, summary=_summarize(findings))


@router.get("/runs/{run_id}/events")
async def run_events(
    run_id: str,
    request: Request,
    last_event_id: str | None = Header(default=None),
) -> StreamingResponse:
    storage = _storage(request)
    _run_or_404(storage, run_id)
    after = int(last_event_id) if last_event_id and last_event_id.isdigit() else 0
    return StreamingResponse(
        stream_run_events(storage, run_id, after),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/runs/{run_id}/cancel", response_model=StoredRun)
def cancel_run(run_id: str, request: Request) -> StoredRun:
    storage = _storage(request)
    run = _run_or_404(storage, run_id)
    if not _jobs(request).cancel(run_id):
        raise HTTPException(status.HTTP_409_CONFLICT, f"run {run_id} is not running ({run.status})")
    return run


@router.get("/findings/{finding_id}", response_model=FindingDetail)
def get_finding(finding_id: str, request: Request) -> FindingDetail:
    detail = _finding_detail(_storage(request), finding_id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"finding {finding_id} not found")
    return detail


@router.post("/findings/{finding_id}/verify", response_model=RefereeResult)
def verify_finding(finding_id: str, request: Request) -> RefereeResult:
    """Re-run the Referee on a stored finding, in that run's workspace."""
    settings = _settings(request)
    storage = _storage(request)
    finding = storage.get_finding(finding_id)
    if finding is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"finding {finding_id} not found")
    assert settings.data_dir is not None
    workspace = settings.data_dir / "workspaces" / (finding.run_id or "") / "repo"
    if not finding.run_id or not workspace.is_dir():
        raise HTTPException(status.HTTP_409_CONFLICT, "the run workspace for this finding is gone")
    referee = Referee(settings=settings, storage=storage)
    return referee.reproduce(workspace, finding)


@router.get("/metrics", response_model=Metrics)
def metrics(request: Request, repo: str | None = None) -> Metrics:
    storage = _storage(request)
    runs = [r for r in storage.list_runs(limit=10_000) if repo is None or r.repo_id == repo]
    finding_ids = {fid for r in runs for fid in r.finding_ids}
    referee = [r for r in storage.list_all_referee_results() if r.finding_id in finding_ids]
    latest: dict[str, RefereeResult] = {}
    for result in referee:  # oldest first, so the newest verdict wins
        latest[result.finding_id] = result
    verified = sum(r.verdict == RefereeVerdict.VERIFIED_BUG for r in latest.values())
    patch_results = [p for p in storage.list_patch_results() if p.finding_id in finding_ids]
    accepted = sum(p.patch_accepted for p in patch_results)
    regressions = sum(bool(p.new_failures) for p in patch_results)

    def ratio(num: int, den: int) -> float | None:
        return round(num / den, 4) if den else None

    return Metrics(
        runs=len(runs),
        findings=len(finding_ids),
        referee_calls=len(referee),
        verified=verified,
        reproduction_rate=ratio(verified, len(latest)),
        patches_attempted=len(patch_results),
        patches_accepted=accepted,
        patch_success_rate=ratio(accepted, len(patch_results)),
        regression_rate=ratio(regressions, len(patch_results)),
        mean_verification_calls=ratio(len(referee) + len(patch_results), len(finding_ids)),
    )
