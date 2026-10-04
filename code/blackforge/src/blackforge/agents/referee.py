"""Deterministic referee: reproduce findings via executable tests only."""

from __future__ import annotations

from pathlib import Path

from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import Finding, RefereeResult, RefereeVerdict
from blackforge.core.storage import Storage
from blackforge.execution.pytest_runner import PytestRunner


class Referee:
    """
    Non-agent referee.

    Accepts a Finding (or an explicit test path) and decides whether the bug
    is reproduced based solely on pytest exit status and captured output.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        storage: Storage | None = None,
        pytest_runner: PytestRunner | None = None,
    ):
        self.settings = settings or get_settings()
        self.storage = storage or Storage(settings=self.settings)
        self.pytest_runner = pytest_runner or PytestRunner(self.settings)

    def reproduce(
        self,
        repo_path: Path | str,
        finding: Finding,
        *,
        persist: bool = True,
        prefer_docker: bool | None = None,
    ) -> RefereeResult:
        repo_path = Path(repo_path).resolve()
        test_target = finding.test_path
        if not test_target:
            # Write generated test into a temp path under the example repo.
            test_target = self._materialize_generated_test(repo_path, finding)

        execution = self.pytest_runner.run_tests(
            repo_path,
            [test_target],
            prefer_docker=prefer_docker,
        )
        combined = self._combine_output(execution.stdout, execution.stderr)
        reproduced, verdict, evidence, confidence = self._judge(
            finding, execution.return_code, combined
        )

        result = RefereeResult(
            finding_id=finding.id,
            reproduced=reproduced,
            evidence=evidence,
            execution_output=combined,
            expected_behavior=finding.expected_behavior,
            observed_behavior=finding.observed_behavior,
            verdict=verdict,
            confidence=confidence,
            return_code=execution.return_code,
            duration_ms=execution.duration_ms,
        )

        if persist:
            self.storage.save_finding(finding)
            self.storage.save_referee_result(result)

        return result

    def _materialize_generated_test(self, repo_path: Path, finding: Finding) -> str:
        generated_dir = repo_path / "tests" / "generated"
        generated_dir.mkdir(parents=True, exist_ok=True)
        path = generated_dir / f"test_{finding.id.lower()}.py"
        path.write_text(finding.generated_test, encoding="utf-8")
        finding.test_path = str(path.relative_to(repo_path))
        return finding.test_path

    def _combine_output(self, stdout: str, stderr: str) -> str:
        parts = [part for part in (stdout.strip(), stderr.strip()) if part]
        return "\n".join(parts)

    def _judge(
        self,
        finding: Finding,
        return_code: int,
        output: str,
    ) -> tuple[bool, RefereeVerdict, str, float]:
        # Pytest: 0 = all passed, 1 = tests failed, >1 = collection/usage error.
        if return_code == 0:
            return (
                False,
                RefereeVerdict.NOT_REPRODUCED,
                "Test passed; failure was not reproduced.",
                0.9,
            )

        if return_code > 1:
            return (
                False,
                RefereeVerdict.INVALID_TEST,
                f"pytest exited with code {return_code}; test may be invalid.\n{output[:500]}",
                0.4,
            )

        # return_code == 1 → at least one failed test
        observed_token = self._needle(finding.observed_behavior)
        if observed_token and observed_token.lower() in output.lower():
            return (
                True,
                RefereeVerdict.VERIFIED_BUG,
                (
                    f"pytest exit code 1 — failure matches observed behavior "
                    f"({observed_token!r})."
                ),
                0.95,
            )

        # Failure happened but message did not match expected observation.
        if "FAILED" in output or "ERROR" in output or "Traceback" in output:
            return (
                True,
                RefereeVerdict.VERIFIED_BUG,
                "pytest exit code 1 — test failed with executable evidence.",
                0.8,
            )

        return (
            False,
            RefereeVerdict.INCONCLUSIVE,
            "pytest returned failure but no clear failure evidence was captured.",
            0.5,
        )

    def _needle(self, observed: str) -> str | None:
        for token in ("TypeError", "ZeroDivisionError", "AssertionError", "ValueError"):
            if token in observed:
                return token
        line = observed.strip().splitlines()[0] if observed.strip() else ""
        return line[:80] if line else None
