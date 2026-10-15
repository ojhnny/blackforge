"""FastAPI application: a thin layer that schedules core calls and streams events."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from blackforge import __version__
from blackforge.api.jobs import RunManager
from blackforge.api.routes import router
from blackforge.core.config import Settings, get_settings
from blackforge.core.storage import Storage

DEFAULT_ORIGINS = "http://localhost:4827,http://127.0.0.1:4827"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    storage = Storage(settings=settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield
        app.state.jobs.shutdown()

    app = FastAPI(
        title="BlackForge API",
        version=__version__,
        description="Reproduce, patch and verify bugs with executable evidence.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.storage = storage
    app.state.jobs = RunManager(settings, storage)

    origins = os.getenv("BLACKFORGE_CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins if origin.strip()],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app
