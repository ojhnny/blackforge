"""Run the Analyze → Discover → Reproduce → Patch → Verify loop on a target repo.

Discovery and patching read the target's seeded manifest until the LLM agents
exist. Every verdict still comes from executing tests: the Referee decides
whether a finding reproduces, and the Verifier decides whether a patch is
accepted.
"""

from __future__ import annotations

import threading
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path

from blackforge.agents.referee import Referee
from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import (
    BugCategory,
    Finding,
    PatchAttempt,
    RefereeVerdict,
    RunEvent,
    StageId,
    StoredRun,
)
from blackforge.core.storage import Storage
from blackforge.core.targets import SeededFinding, load_manifest, seeded_to_finding
from blackforge.execution.workspace import copy_repo
from blackforge.verify.verifier import Verifier

_MODE_STAGES: dict[str, set[StageId]] = {
    "full": {"analyze", "discover", "reproduce", "patch", "verify"},
    "discover_only": {"analyze", "discover"},
    "verify_existing": {"analyze", "discover", "reproduce"},
}


class RunCancelled(Exception):
    """Raised between steps when a cancel was requested."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _diff_stats(patch: str) -> tuple[int, int]:
    adds = dels = 0
    for line in patch.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            adds += 1
        elif line.startswith("-") and not line.startswith("---"):
            dels += 1
    return adds, dels


class Pipeline:
    def __init__(
        self,
        settings: Settings | None = None,
        storage: Storage | None = None,
        referee: Referee | None = None,
        verifier: Verifier | None = None,
    ):
        self.settings = settings or get_settings()
        self.storage = storage or Storage(settings=self.settings)
        self.referee = referee or Referee(settings=self.settings, storage=self.storage)
        self.verifier = verifier or Verifier(settings=self.settings)

    # -- event helpers -----------------------------------------------------

    def _emit(self, run: StoredRun, type_: str, message: str = "", stage: StageId | None = None) -> None:
        self.storage.append_event(
            RunEvent(run_id=run.id, type=type_, message=message, stage=stage)  # type: ignore[arg-type]
        )

    def _log(self, run: StoredRun, lines: Iterable[str], stage: StageId | None = None) -> None:
        for line in lines:
            self._emit(run, "log", line, stage)

    def _stage(self, run: StoredRun, stage_id: StageId):
        return next(stage for stage in run.stages if stage.id == stage_id)

    def _start(self, run: StoredRun, stage_id: StageId, detail: str) -> None:
        stage = self._stage(run, stage_id)
        stage.status = "active"
        stage.detail = detail
        stage.started_at = _now()
        self.storage.save_run(run)
        self._emit(run, "stage_started", detail, stage_id)

    def _finish(self, run: StoredRun, stage_id: StageId, detail: str) -> None:
        stage = self._stage(run, stage_id)
        stage.status = "done"
        stage.detail = detail
        stage.completed_at = _now()
        if stage.started_at:
            stage.duration_ms = int((stage.completed_at - stage.started_at).total_seconds() * 1000)
        self.storage.save_run(run)
        self._emit(run, "stage_completed", detail, stage_id)

    def _skip(self, run: StoredRun, stage_id: StageId, reason: str) -> None:
        stage = self._stage(run, stage_id)
        stage.status = "skipped"
        stage.detail = reason
        self.storage.save_run(run)
        self._emit(run, "stage_skipped", reason, stage_id)

    def _check(self, cancel: threading.Event | None) -> None:
        if cancel is not None and cancel.is_set():
            raise RunCancelled()

    # -- the run -----------------------------------------------------------

    def execute(
        self,
        run: StoredRun,
        repo_path: Path,
        *,
        categories: list[BugCategory] | None = None,
        cancel: threading.Event | None = None,
        prefer_docker: bool | None = None,
    ) -> StoredRun:
        enabled = _MODE_STAGES[run.mode]
        assert self.settings.data_dir is not None
        run_dir = self.settings.data_dir / "workspaces" / run.id
        current: StageId | None = None

        run.status = "running"
        self.storage.save_run(run)
        self._emit(run, "run_started", f"{run.repo_path} · mode={run.mode}")

        try:
            current = "analyze"
            self._start(run, "analyze", "Indexing repository and tests")
            workspace = copy_repo(repo_path, run_dir / "repo")
            detail = self._analyze(workspace)
            self._log(run, [f"blackforge analyze {run.repo_path}", detail], "analyze")
            self._finish(run, "analyze", detail)
            self._check(cancel)

            current = "discover"
            self._start(run, "discover", "Loading candidate findings")
            seeds = self._candidates(repo_path, categories)
            findings = [seeded_to_finding(seed, workspace, run.id) for seed in seeds]
            for finding in findings:
                self.storage.save_finding(finding)
            run.finding_ids = [finding.id for finding in findings]
            detail = f"{len(findings)} candidate findings from blackforge.json (discovery agent planned)"
            self._log(run, [f"discovery: {len(findings)} candidate findings"], "discover")
            self._finish(run, "discover", detail)
            self._check(cancel)

            verified: list[tuple[Finding, SeededFinding]] = []
            if "reproduce" in enabled:
                current = "reproduce"
                self._start(run, "reproduce", "Running reproduction tests")
                for index, (finding, seed) in enumerate(zip(findings, seeds), start=1):
                    self._check(cancel)
                    result = self.referee.reproduce(
                        workspace, finding, prefer_docker=prefer_docker
                    )
                    self._log(
                        run,
                        [
                            f"[{index}/{len(findings)}] pytest {finding.test_path}",
                            f"{finding.id}: {result.verdict.value} (exit {result.return_code})",
                        ],
                        "reproduce",
                    )
                    if result.verdict == RefereeVerdict.VERIFIED_BUG:
                        verified.append((finding, seed))
                rejected = len(findings) - len(verified)
                detail = f"verified: {len(verified)} · not reproduced: {rejected}"
                self._log(run, [detail], "reproduce")
                self._finish(run, "reproduce", detail)
            else:
                self._skip(run, "reproduce", "Skipped in this mode")

            patches: list[tuple[Finding, PatchAttempt]] = []
            if "patch" in enabled:
                current = "patch"
                self._check(cancel)
                self._start(run, "patch", "Preparing patches for verified findings")
                for finding, seed in verified:
                    if seed.reference_patch is None:
                        self._log(run, [f"{finding.id}: no patch available"], "patch")
                        continue
                    patch = PatchAttempt(
                        finding_id=finding.id,
                        files_modified=seed.reference_patch.files_modified,
                        patch=seed.reference_patch.patch,
                        explanation=seed.reference_patch.explanation,
                        tests_added_or_modified=[finding.test_path] if finding.test_path else [],
                    )
                    self.storage.save_patch_attempt(patch)
                    run.patch_ids.append(patch.id)
                    patches.append((finding, patch))
                    adds, dels = _diff_stats(patch.patch)
                    self._log(
                        run,
                        [f"{patch.id} -> {', '.join(patch.files_modified)} (+{adds} -{dels})"],
                        "patch",
                    )
                detail = f"{len(patches)} reference patch(es) for {len(verified)} verified finding(s) (patch agent planned)"
                self._finish(run, "patch", detail)
            else:
                self._skip(run, "patch", "Skipped in this mode")

            if "verify" in enabled:
                current = "verify"
                self._check(cancel)
                self._start(run, "verify", "Rerunning reproduction test and regression suite")
                accepted = 0
                for finding, patch in patches:
                    self._check(cancel)
                    result = self.verifier.verify(
                        workspace,
                        finding,
                        patch,
                        run_dir / patch.id,
                        prefer_docker=prefer_docker,
                    )
                    self.storage.save_patch_result(result)
                    accepted += int(result.patch_accepted)
                    verdict = "accepted" if result.patch_accepted else f"rejected: {result.rejection_reason}"
                    self._log(
                        run,
                        [
                            f"pytest {finding.test_path} -> {'PASSED' if result.attack_test_passed else 'FAILED'}",
                            f"pytest -> {result.regression_passed}/{result.regression_total} passed",
                            f"{patch.id} {verdict} · {finding.id}",
                        ],
                        "verify",
                    )
                detail = f"{accepted} of {len(patches)} patch(es) accepted"
                self._finish(run, "verify", detail)
            else:
                self._skip(run, "verify", "Skipped in this mode")

            run.status = "completed"
            run.completed_at = _now()
            self.storage.save_run(run)
            self._emit(run, "run_completed", "Run completed")
        except RunCancelled:
            self._mark_stopped(run, current, "cancelled", "Cancelled by user")
            self._emit(run, "run_cancelled", "Run cancelled")
        except Exception as exc:  # surface every failure to the console
            self._mark_stopped(run, current, "failed", f"{type(exc).__name__}: {exc}")
            self._emit(run, "run_failed", run.error or "Run failed", current)
        return run

    def _mark_stopped(self, run: StoredRun, current: StageId | None, status: str, error: str) -> None:
        for stage in run.stages:
            if stage.status == "active":
                stage.status = "failed" if status == "failed" else "skipped"
            elif stage.status == "pending":
                stage.status = "skipped"
        run.status = status  # type: ignore[assignment]
        run.error = error
        run.completed_at = _now()
        self.storage.save_run(run)

    def _analyze(self, workspace: Path) -> str:
        files = [p for p in workspace.rglob("*") if p.is_file()]
        py_files = [p for p in files if p.suffix == ".py"]
        tests = [p for p in py_files if p.name.startswith("test_")]
        functions = sum(
            line.lstrip().startswith("def ")
            for p in py_files
            if p not in tests
            for line in p.read_text(encoding="utf-8", errors="replace").splitlines()
        )
        return (
            f"Indexed {len(files)} files · {functions} functions · {len(tests)} test files"
        )

    def _candidates(
        self, repo_path: Path, categories: list[BugCategory] | None
    ) -> list[SeededFinding]:
        seeds = load_manifest(repo_path).findings
        if categories:
            seeds = [seed for seed in seeds if seed.category in categories]
        return seeds
