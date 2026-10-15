import { Settings } from 'lucide-react'
import { formatElapsed, statusLabel } from '../lib/format'
import type { AppView, DataSource, RunStatus } from '../types'

interface HeaderProps {
  projectName: string
  status: RunStatus
  runId: string | null
  startedAt: number | null
  completedAt: number | null
  now: number
  view: AppView
  dataSource: DataSource
  onViewChange: (view: AppView) => void
}

export function Header({
  projectName,
  status,
  runId,
  startedAt,
  completedAt,
  now,
  view,
  dataSource,
  onViewChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(13,17,23,0.94)] backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold tracking-tight text-[var(--text)]">
              BlackForge AI
            </div>
            <div className="mono truncate text-[12px] text-[var(--text-muted)]">
              {projectName}
            </div>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              className={`nav-link ${view === 'run' ? 'nav-link-active' : ''}`}
              onClick={() => onViewChange('run')}
            >
              Run
            </button>
            <button
              type="button"
              className={`nav-link ${view === 'evaluation' ? 'nav-link-active' : ''}`}
              onClick={() => onViewChange('evaluation')}
            >
              Evaluation
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`badge ${dataSource === 'live' ? 'badge-success' : 'badge-warning'}`}
            title={
              dataSource === 'live'
                ? 'Connected to the BlackForge API'
                : 'API not reachable; showing simulated data'
            }
          >
            {dataSource === 'live' ? 'Live API' : 'Mock data'}
          </span>
          <div className="hidden items-center gap-3 text-[12px] text-[var(--text-muted)] md:flex">
            <span>
              Status:{' '}
              <span className="text-[var(--text-secondary)]">
                {statusLabel(status)}
              </span>
            </span>
            <span>
              Elapsed:{' '}
              <span className="text-[var(--text-secondary)]">
                {formatElapsed(startedAt, completedAt, now)}
              </span>
            </span>
            <span>
              Run:{' '}
              <span className="mono text-[var(--text-secondary)]">
                {runId ?? '—'}
              </span>
            </span>
          </div>
          <button type="button" className="btn btn-ghost px-2" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
