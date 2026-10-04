"""Run pytest either via Docker or locally."""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path

from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import ExecutionResult
from blackforge.execution.docker_runner import DockerRunner, DockerUnavailableError


class PytestRunner:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.docker = DockerRunner(self.settings)

    def run_tests(
        self,
        repo_path: Path,
        test_targets: list[str] | None = None,
        *,
        prefer_docker: bool | None = None,
        extra_args: list[str] | None = None,
    ) -> ExecutionResult:
        repo_path = repo_path.resolve()
        targets = test_targets or ["tests"]
        args = ["-q", "--tb=short", *targets, *(extra_args or [])]
        prefer_docker = (
            self.settings.prefer_docker if prefer_docker is None else prefer_docker
        )

        if prefer_docker and self.docker.available():
            return self._run_in_docker(repo_path, args)
        return self._run_locally(repo_path, args)

    def _run_in_docker(self, repo_path: Path, pytest_args: list[str]) -> ExecutionResult:
        # Install pytest in the ephemeral container, then run tests.
        command = [
            "bash",
            "-lc",
            "pip install -q pytest && PYTHONPATH=src pytest " + " ".join(pytest_args),
        ]
        try:
            return self.docker.run(repo_path, command)
        except DockerUnavailableError:
            return self._run_locally(repo_path, pytest_args)

    def _run_locally(self, repo_path: Path, pytest_args: list[str]) -> ExecutionResult:
        import os

        pytest_bin = shutil.which("pytest")
        if pytest_bin:
            command = [pytest_bin, *pytest_args]
        else:
            command = [sys.executable, "-m", "pytest", *pytest_args]

        env = os.environ.copy()
        src_path = str(repo_path / "src")
        existing = env.get("PYTHONPATH", "")
        env["PYTHONPATH"] = f"{src_path}:{existing}" if existing else src_path

        started = time.perf_counter()
        completed = subprocess.run(
            command,
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=self.settings.execution_timeout_s,
            check=False,
            env=env,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)

        return ExecutionResult(
            command=command,
            return_code=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
            duration_ms=duration_ms,
            backend="local",
            workdir=str(repo_path),
        )
