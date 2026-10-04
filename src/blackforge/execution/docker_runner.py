"""Run commands inside Docker for isolated execution."""

from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import ExecutionResult


class DockerUnavailableError(RuntimeError):
    """Raised when Docker is required but not available."""


class DockerRunner:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def available(self) -> bool:
        if not self.settings.docker_enabled:
            return False
        if shutil.which("docker") is None:
            return False
        try:
            completed = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            return completed.returncode == 0
        except (OSError, subprocess.SubprocessError):
            return False

    def run(
        self,
        workdir: Path,
        command: list[str],
        *,
        image: str | None = None,
        timeout_s: int | None = None,
    ) -> ExecutionResult:
        if not self.available():
            raise DockerUnavailableError(
                "Docker is not available. Install Docker or use the local pytest runner."
            )

        workdir = workdir.resolve()
        image = image or self.settings.docker_image
        timeout_s = timeout_s or self.settings.execution_timeout_s

        docker_cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{workdir}:/work",
            "-w",
            "/work",
            image,
            *command,
        ]

        started = time.perf_counter()
        completed = subprocess.run(
            docker_cmd,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)

        return ExecutionResult(
            command=docker_cmd,
            return_code=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
            duration_ms=duration_ms,
            backend="docker",
            workdir=str(workdir),
        )
