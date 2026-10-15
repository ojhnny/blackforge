"""Deterministic patch verification: apply, compile, rerun attack test and suite."""

from __future__ import annotations

import py_compile
import re
from pathlib import Path

from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import Finding, PatchAttempt, PatchResult
from blackforge.execution.patcher import Patcher, PatchError
from blackforge.execution.pytest_runner import PytestRunner
from blackforge.execution.workspace import copy_repo

_COUNT_RE = re.compile(r"(\d+) (passed|failed|errors?)")
_FAILED_RE = re.compile(r"^(?:FAILED|ERROR) (\S+)", re.MULTILINE)


def parse_pytest_counts(output: str) -> tuple[int, int]:
    """Return (passed, total) from pytest's summary line."""
    counts = {"passed": 0, "failed": 0, "error": 0}
    for number, kind in _COUNT_RE.findall(output):
        counts["error" if kind.startswith("error") else kind] = int(number)
    return counts["passed"], counts["passed"] + counts["failed"] + counts["error"]


class Verifier:
    """
    Accepts a patch only if, on a fresh copy of the repo:
    it applies cleanly, modified Python files compile, the attack test that
    reproduced the bug now passes, and the full test suite passes.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        pytest_runner: PytestRunner | None = None,
        patcher: Patcher | None = None,
    ):
        self.settings = settings or get_settings()
        self.pytest_runner = pytest_runner or PytestRunner(self.settings)
        self.patcher = patcher or Patcher()

    def verify(
        self,
        repo_path: Path,
        finding: Finding,
        patch: PatchAttempt,
        workdir: Path,
        *,
        prefer_docker: bool | None = None,
    ) -> PatchResult:
        copy = copy_repo(repo_path, workdir)
        outputs: list[str] = []

        def reject(reason: str, **fields: object) -> PatchResult:
            values: dict[str, object] = {
                "attack_test_passed": False,
                "regression_tests_passed": False,
                "static_checks_passed": False,
            }
            values.update(fields)
            return PatchResult(
                finding_id=finding.id,
                patch_id=patch.id,
                patch_accepted=False,
                rejection_reason=reason,
                execution_output="\n".join(outputs),
                **values,  # type: ignore[arg-type]
            )

        try:
            modified = self.patcher.apply(copy, patch)
        except PatchError as exc:
            outputs.append(str(exc))
            return reject("Patch did not apply cleanly.", patch_applied=False)
        outputs.append(f"applied {patch.id} -> {', '.join(modified)}")

        static_ok = True
        for rel in modified:
            if not rel.endswith(".py"):
                continue
            try:
                py_compile.compile(str(copy / rel), doraise=True)
            except py_compile.PyCompileError as exc:
                static_ok = False
                outputs.append(f"compile error: {exc.msg}")
        if not static_ok:
            return reject("Modified files do not compile.")

        if not finding.test_path:
            return reject("Finding has no reproduction test to rerun.", static_checks_passed=True)

        attack = self.pytest_runner.run_tests(
            copy, [finding.test_path], prefer_docker=prefer_docker
        )
        outputs.append(f"$ pytest {finding.test_path}\n{attack.stdout.strip()}")
        attack_ok = attack.return_code == 0

        suite = self.pytest_runner.run_tests(copy, None, prefer_docker=prefer_docker)
        outputs.append(f"$ pytest\n{suite.stdout.strip()}")
        passed, total = parse_pytest_counts(suite.stdout)
        suite_ok = suite.return_code == 0
        new_failures = _FAILED_RE.findall(suite.stdout)

        reason = None
        if not attack_ok:
            reason = "Reproduction test still fails after the patch."
        elif not suite_ok:
            reason = f"Regression suite failed ({passed}/{total} passed)."

        return PatchResult(
            finding_id=finding.id,
            patch_id=patch.id,
            patch_applied=True,
            attack_test_passed=attack_ok,
            regression_tests_passed=suite_ok,
            regression_passed=passed,
            regression_total=total,
            static_checks_passed=True,
            new_failures=new_failures,
            patch_accepted=attack_ok and suite_ok,
            rejection_reason=reason,
            execution_output="\n".join(outputs),
        )
