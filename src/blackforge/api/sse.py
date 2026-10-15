"""Server-Sent Events stream of a run's event log."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from blackforge.core.storage import Storage

POLL_INTERVAL_S = 0.25
KEEPALIVE_EVERY = 60  # polls, about 15 seconds
FINISHED = {"completed", "failed", "cancelled"}


async def stream_run_events(
    storage: Storage, run_id: str, after_seq: int = 0
) -> AsyncIterator[str]:
    """Yield SSE frames for every new event until the run reaches a terminal event."""
    last = after_seq
    idle = 0
    yield "retry: 1000\n\n"
    while True:
        events = await asyncio.to_thread(storage.list_events, run_id, last)
        for event in events:
            last = event.seq
            yield f"id: {event.seq}\nevent: {event.type}\ndata: {event.model_dump_json()}\n\n"
            if event.terminal:
                return
        idle = 0 if events else idle + 1
        if not events:
            run = await asyncio.to_thread(storage.get_run, run_id)
            if run is None:
                return
            if run.status in FINISHED:
                # The final event may land just after the status is saved:
                # flush anything still pending, then close.
                for event in await asyncio.to_thread(storage.list_events, run_id, last):
                    yield f"id: {event.seq}\nevent: {event.type}\ndata: {event.model_dump_json()}\n\n"
                return
            if idle % KEEPALIVE_EVERY == 0:
                yield ": keep-alive\n\n"
        await asyncio.sleep(POLL_INTERVAL_S)
