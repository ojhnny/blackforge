"""Background execution of pipeline runs."""

from __future__ import annotations

import threading
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path

from blackforge.core.config import Settings
from blackforge.core.schemas import BugCategory, StoredRun
from blackforge.core.storage import Storage
from blackforge.pipeline import Pipeline


class RunManager:
    """
    Runs pipelines on a small thread pool inside the API process.

    State lives in SQLite (runs + run_events), so a client can always rebuild a
    run from storage; the pool only holds the work in flight. A separate worker
    process polling a jobs table is the upgrade if runs need to survive restarts.
    """

    def __init__(self, settings: Settings, storage: Storage, max_workers: int = 2):
        self.settings = settings
        self.storage = storage
        self.pipeline = Pipeline(settings=settings, storage=storage)
        self._pool = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="bf-run")
        self._cancel: dict[str, threading.Event] = {}
        self._futures: dict[str, Future[StoredRun]] = {}
        self._lock = threading.Lock()

    def submit(
        self,
        run: StoredRun,
        repo_path: Path,
        categories: list[BugCategory] | None,
        prefer_docker: bool | None,
    ) -> StoredRun:
        cancel = threading.Event()
        self.storage.save_run(run)
        with self._lock:
            self._cancel[run.id] = cancel
            self._futures[run.id] = self._pool.submit(
                self._execute, run, repo_path, categories, cancel, prefer_docker
            )
        return run

    def _execute(
        self,
        run: StoredRun,
        repo_path: Path,
        categories: list[BugCategory] | None,
        cancel: threading.Event,
        prefer_docker: bool | None,
    ) -> StoredRun:
        try:
            return self.pipeline.execute(
                run, repo_path, categories=categories, cancel=cancel, prefer_docker=prefer_docker
            )
        finally:
            with self._lock:
                self._cancel.pop(run.id, None)

    def cancel(self, run_id: str) -> bool:
        with self._lock:
            event = self._cancel.get(run_id)
        if event is None:
            return False
        event.set()
        return True

    def wait(self, run_id: str, timeout: float | None = None) -> StoredRun | None:
        future = self._futures.get(run_id)
        return future.result(timeout=timeout) if future else None

    def shutdown(self) -> None:
        for event in list(self._cancel.values()):
            event.set()
        self._pool.shutdown(wait=True)
