"""Runtime configuration for BlackForge execution."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field


class Settings(BaseModel):
    project_root: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parents[3]
    )
    data_dir: Path | None = None
    examples_dir: Path | None = None
    sqlite_path: Path | None = None
    docker_image: str = "python:3.12-slim"
    docker_enabled: bool = True
    execution_timeout_s: int = 120
    prefer_docker: bool = True

    def model_post_init(self, __context: object) -> None:
        if self.data_dir is None:
            self.data_dir = self.project_root / ".blackforge"
        if self.examples_dir is None:
            self.examples_dir = Path(
                os.getenv("BLACKFORGE_EXAMPLES_DIR", self.project_root / "examples")
            )
        if self.sqlite_path is None:
            self.sqlite_path = self.data_dir / "blackforge.db"
        env_prefer = os.getenv("BLACKFORGE_PREFER_DOCKER")
        if env_prefer is not None:
            self.prefer_docker = env_prefer.lower() in {"1", "true", "yes"}
        env_image = os.getenv("BLACKFORGE_DOCKER_IMAGE")
        if env_image:
            self.docker_image = env_image


def get_settings() -> Settings:
    return Settings()
