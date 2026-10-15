"""Isolated working copies of target repositories."""

from __future__ import annotations

import shutil
from pathlib import Path

_IGNORE = shutil.ignore_patterns(
    ".git", "__pycache__", ".pytest_cache", ".venv", "node_modules", "*.pyc"
)


def copy_repo(source: Path, dest: Path) -> Path:
    """Copy a target repo so runs never write into the original checkout."""
    source = source.resolve()
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, dest, ignore=_IGNORE)
    return dest
