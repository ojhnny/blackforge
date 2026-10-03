# BlackForge AI — Forge Console

Frontend control-room dashboard for **BlackForge AI**: an autonomous bug discovery, repair, and verification system.

Tagline: **Break it. Fix it. Prove it.**

This app is a Phase 1 demo — React + TypeScript + Vite + Tailwind with realistic mock data and a simulated forge run. No auth, database, or backend.

## What it shows

- Target repo selector and forge run controls
- Agent timeline (ingest → Red → Referee → Blue → Prove)
- Finding detail, generated failing test, terminal evidence
- Patch diff, verification results, and evaluation metrics
- Timed reveal of each stage during a simulated run

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- lucide-react

## Run locally

```bash
cd code/blackforge
npm install
npm run dev
```

Dev server binds to **http://127.0.0.1:4827** (also `0.0.0.0:4827`).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint with oxlint         |

## Project layout

```text
src/
  components/   # Console panels (timeline, finding, test, terminal, diff, verify, metrics)
  data/mock.ts  # Mock repos, finding, patch, referee, metrics
  hooks/        # Simulated forge run with timeline delays
  types.ts      # Interfaces aligned with future backend schemas
  App.tsx
```

## Notes

- Click **Start forge run** to play the Break → Fix → Prove simulation.
- Data is mock-only; a FastAPI backend will replace these stubs in later phases.
