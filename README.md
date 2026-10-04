# BlackForge AI

Autonomous bug discovery, repair, and verification — **Break it. Fix it. Prove it.**

BlackForge does not trust AI claims. It requires executable evidence.

## Layout

```text
code/blackforge/     # Phase 1 React analysis console
src/blackforge/      # Phase 2 deterministic Python core
examples/            # Intentionally buggy target repos
tests/               # Unit + integration tests for the core
```

## Phase 2 — Deterministic core

Python package with:

- Pydantic schemas (`Finding`, `RefereeResult`, `PatchAttempt`, `PatchResult`)
- Docker runner (isolated execution when Docker is available)
- Pytest runner (Docker or local fallback)
- Patch application utility
- SQLite storage
- Deterministic Referee (no LLM)
- Example repo: `examples/buggy_python`

### Setup

```bash
# from repo root
uv sync --extra dev
# or: pip install -e ".[dev]"
```

### Reproduce a failing test (Referee)

Manually pass the known failing test into the system:

```bash
uv run blackforge reproduce \
  --repo examples/buggy_python \
  --test tests/test_rolling_mean_none.py \
  --local
```

Expected: `reproduced: True`, `verdict: verified_bug`, pytest exit code `1`, `TypeError` in the execution output.

### Run core tests

```bash
uv run pytest -q
```

### Example bug

`examples/buggy_python` contains `rolling_mean`, which crashes when a window includes `None`. See [`examples/buggy_python/README.md`](examples/buggy_python/README.md).

## Phase 1 — Analysis console

```bash
cd code/blackforge
npm install
npm run dev
```

Open **http://127.0.0.1:4827**. See [`code/blackforge/README.md`](code/blackforge/README.md).
