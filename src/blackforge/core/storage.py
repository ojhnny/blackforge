"""SQLite storage for runs, findings, referee results, and patches."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from blackforge.core.config import Settings, get_settings
from blackforge.core.schemas import (
    Finding,
    PatchAttempt,
    PatchResult,
    RefereeResult,
    StoredRun,
)

T = TypeVar("T", bound=BaseModel)


class Storage:
    def __init__(self, db_path: Path | None = None, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.db_path = db_path or self.settings.sqlite_path
        assert self.db_path is not None
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS findings (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS referee_results (
                    id TEXT PRIMARY KEY,
                    finding_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS patch_attempts (
                    id TEXT PRIMARY KEY,
                    finding_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS patch_results (
                    id TEXT PRIMARY KEY,
                    finding_id TEXT NOT NULL,
                    patch_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def _dump(self, model: BaseModel) -> str:
        return model.model_dump_json()

    def _load(self, model_type: type[T], payload: str) -> T:
        return model_type.model_validate_json(payload)

    def save_run(self, run: StoredRun) -> StoredRun:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO runs (id, payload, created_at) VALUES (?, ?, ?)",
                (run.id, self._dump(run), run.created_at.isoformat()),
            )
        return run

    def get_run(self, run_id: str) -> StoredRun | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM runs WHERE id = ?", (run_id,)
            ).fetchone()
        return self._load(StoredRun, row["payload"]) if row else None

    def save_finding(self, finding: Finding) -> Finding:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO findings (id, payload, created_at) VALUES (?, ?, ?)",
                (finding.id, self._dump(finding), finding.created_at.isoformat()),
            )
        return finding

    def get_finding(self, finding_id: str) -> Finding | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM findings WHERE id = ?", (finding_id,)
            ).fetchone()
        return self._load(Finding, row["payload"]) if row else None

    def save_referee_result(self, result: RefereeResult) -> RefereeResult:
        result_id = f"ref_{result.finding_id}_{int(datetime.now(timezone.utc).timestamp())}"
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO referee_results
                (id, finding_id, payload, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    result_id,
                    result.finding_id,
                    self._dump(result),
                    result.created_at.isoformat(),
                ),
            )
        return result

    def list_referee_results(self, finding_id: str) -> list[RefereeResult]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT payload FROM referee_results
                WHERE finding_id = ?
                ORDER BY created_at DESC
                """,
                (finding_id,),
            ).fetchall()
        return [self._load(RefereeResult, row["payload"]) for row in rows]

    def save_patch_attempt(self, patch: PatchAttempt) -> PatchAttempt:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO patch_attempts
                (id, finding_id, payload, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    patch.id,
                    patch.finding_id,
                    self._dump(patch),
                    patch.created_at.isoformat(),
                ),
            )
        return patch

    def save_patch_result(self, result: PatchResult) -> PatchResult:
        result_id = f"pres_{result.patch_id}"
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO patch_results
                (id, finding_id, patch_id, payload, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    result_id,
                    result.finding_id,
                    result.patch_id,
                    self._dump(result),
                    result.created_at.isoformat(),
                ),
            )
        return result
