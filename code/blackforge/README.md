# BlackForge AI — Analysis Console

Engineering console for **BlackForge AI**: an autonomous debugging and verification system that discovers bugs, reproduces them with executable evidence, generates patches, reruns regressions, and accepts or rejects the result.

## What it shows

- Run configuration (repository, branch, commit, mode, categories, environment)
- Live run summary and workflow stages (Analyze → Discover → Reproduce → Patch → Verify)
- Findings list with severity, location, and verification state
- Evidence (reproduction steps, generated test, execution log, stack trace)
- Patch diff and verification results
- Collapsible execution log, system diagnostics, and evaluation metrics

This is a Phase 1 frontend demo with realistic mock data and a timed simulated analysis run. No auth, database, or backend.

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

Dev server: **http://127.0.0.1:4827**

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint with oxlint |

## Layout

```text
src/
  components/   # Console sections
  data/mock.ts  # Mock repos, findings, patch, metrics
  hooks/        # Simulated analysis run
  lib/          # Formatting helpers
  types.ts
  App.tsx
```

Click **Run Analysis** to play the simulated workflow.
