"""Target repositories and their seeded-finding manifests (blackforge.json)."""

from __future__ import annotations

import subprocess
from pathlib import Path

from pydantic import BaseModel, Field

from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import BugCategory, Finding, Severity

MANIFEST_NAME = "blackforge.json"


class ReferencePatch(BaseModel):
    files_modified: list[str]
    patch: str
    explanation: str


class SeededFinding(BaseModel):
    """A candidate finding written by hand until the discovery agent exists."""

    key: str
    category: BugCategory
    file: str
    function_or_query: str | None = None
    location: str | None = None
    description: str
    triggering_input: str
    expected_behavior: str
    observed_behavior: str
    reproduction_steps: list[str] = Field(default_factory=list)
    test_path: str | None = None
    generated_test: str | None = None
    severity: Severity = Severity.MEDIUM
    confidence: float = 0.5
    reference_patch: ReferencePatch | None = None


class Manifest(BaseModel):
    name: str
    language: str = "Python"
    default_branch: str = "main"
    categories: list[BugCategory] = Field(default_factory=list)
    description: str = ""
    findings: list[SeededFinding] = Field(default_factory=list)


class TargetRepo(BaseModel):
    id: str
    name: str
    path: str
    default_branch: str
    commit: str
    language: str
    categories: list[BugCategory]
    seeded_findings: int


def _commit_for(path: Path) -> str:
    try:
        completed = subprocess.run(
            ["git", "log", "-1", "--format=%h", "--", "."],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return "unknown"
    return completed.stdout.strip() or "unknown"


def load_manifest(repo_path: Path) -> Manifest:
    return Manifest.model_validate_json(
        (repo_path / MANIFEST_NAME).read_text(encoding="utf-8")
    )


def list_targets(settings: Settings | None = None) -> list[TargetRepo]:
    settings = settings or get_settings()
    assert settings.examples_dir is not None
    targets: list[TargetRepo] = []
    if not settings.examples_dir.is_dir():
        return targets
    for child in sorted(settings.examples_dir.iterdir()):
        if not (child / MANIFEST_NAME).is_file():
            continue
        manifest = load_manifest(child)
        try:
            rel = child.resolve().relative_to(settings.project_root.resolve())
            display = str(rel)
        except ValueError:
            display = str(child)
        targets.append(
            TargetRepo(
                id=child.name,
                name=manifest.name,
                path=display,
                default_branch=manifest.default_branch,
                commit=_commit_for(child),
                language=manifest.language,
                categories=manifest.categories,
                seeded_findings=len(manifest.findings),
            )
        )
    return targets


def resolve_target(repo_id: str, settings: Settings | None = None) -> Path | None:
    """Map a repo id to its directory, refusing anything outside examples_dir."""
    settings = settings or get_settings()
    assert settings.examples_dir is not None
    root = settings.examples_dir.resolve()
    candidate = (root / repo_id).resolve()
    if candidate.parent != root or not (candidate / MANIFEST_NAME).is_file():
        return None
    return candidate


def seeded_to_finding(seed: SeededFinding, repo_path: Path, run_id: str | None) -> Finding:
    generated = seed.generated_test
    if generated is None and seed.test_path:
        generated = (repo_path / seed.test_path).read_text(encoding="utf-8")
    return Finding(
        category=seed.category,
        file=seed.file,
        function_or_query=seed.function_or_query,
        location=seed.location,
        description=seed.description,
        triggering_input=seed.triggering_input,
        expected_behavior=seed.expected_behavior,
        observed_behavior=seed.observed_behavior,
        reproduction_steps=seed.reproduction_steps,
        generated_test=generated or "",
        test_path=seed.test_path,
        severity=seed.severity,
        confidence=seed.confidence,
        run_id=run_id,
    )
