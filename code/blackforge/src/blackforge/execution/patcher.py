"""Apply unified diffs to a target repository."""

from __future__ import annotations

import subprocess
from pathlib import Path

from blackforge.core.schemas import PatchAttempt


class PatchError(RuntimeError):
    """Raised when a patch cannot be applied cleanly."""


class Patcher:
    def apply(self, repo_path: Path, patch: PatchAttempt | str) -> list[str]:
        """Apply a unified diff and return modified file paths."""
        repo_path = repo_path.resolve()
        diff_text = patch.patch if isinstance(patch, PatchAttempt) else patch
        if not diff_text.strip():
            raise PatchError("Empty patch")

        patch_file = repo_path / ".blackforge_pending.patch"
        patch_file.write_text(diff_text, encoding="utf-8")
        try:
            completed = subprocess.run(
                ["patch", "-p1", "--forward", "--input", str(patch_file)],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=False,
            )
            if completed.returncode != 0:
                # Fallback: pure-Python apply for simple single-file hunks.
                modified = self._apply_simple(repo_path, diff_text)
                if modified:
                    return modified
                raise PatchError(
                    f"patch failed ({completed.returncode}): "
                    f"{completed.stdout}\n{completed.stderr}"
                )
            if isinstance(patch, PatchAttempt):
                return list(patch.files_modified)
            return self._files_from_diff(diff_text)
        finally:
            if patch_file.exists():
                patch_file.unlink()

    def _files_from_diff(self, diff_text: str) -> list[str]:
        files: list[str] = []
        for line in diff_text.splitlines():
            if line.startswith("+++ b/"):
                files.append(line[6:])
        return files

    def _apply_simple(self, repo_path: Path, diff_text: str) -> list[str]:
        """Minimal unified-diff applier for controlled example patches."""
        files = self._files_from_diff(diff_text)
        if len(files) != 1:
            return []

        target = repo_path / files[0]
        if not target.exists():
            return []

        original_lines = target.read_text(encoding="utf-8").splitlines(keepends=True)
        hunks = self._parse_hunks(diff_text)
        if not hunks:
            return []

        # Apply hunks from bottom to top so line numbers stay valid.
        working = list(original_lines)
        for old_start, old_count, new_lines in sorted(hunks, key=lambda h: h[0], reverse=True):
            start = old_start - 1
            end = start + old_count
            working[start:end] = new_lines

        target.write_text("".join(working), encoding="utf-8")
        return files

    def _parse_hunks(
        self, diff_text: str
    ) -> list[tuple[int, int, list[str]]]:
        hunks: list[tuple[int, int, list[str]]] = []
        old_start = 0
        old_count = 0
        new_lines: list[str] = []
        in_hunk = False

        for line in diff_text.splitlines(keepends=True):
            if line.startswith("@@"):
                if in_hunk:
                    hunks.append((old_start, old_count, new_lines))
                header = line.strip()
                # @@ -42,10 +42,14 @@
                try:
                    minus = header.split()[1]  # -42,10
                    parts = minus[1:].split(",")
                    old_start = int(parts[0])
                    old_count = int(parts[1]) if len(parts) > 1 else 1
                except (IndexError, ValueError):
                    return []
                new_lines = []
                in_hunk = True
                continue

            if not in_hunk:
                continue

            if line.startswith("+") and not line.startswith("+++"):
                new_lines.append(line[1:])
            elif line.startswith("-") and not line.startswith("---"):
                continue
            elif line.startswith("\\"):
                continue
            else:
                # context line (may start with space)
                new_lines.append(line[1:] if line.startswith(" ") else line)

        if in_hunk:
            hunks.append((old_start, old_count, new_lines))
        return hunks
