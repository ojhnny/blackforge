import { Settings } from 'lucide-react'
import { formatElapsed, statusLabel } from '../lib/format'
import type { RunStatus } from '../types'

interface HeaderProps {
  projectName: string
  status: RunStatus
  runId: string | null
  startedAt: number | null
  completedAt: number | null
  now: number
}

export function Header({
  projectName,
  status,
  runId,
  startedAt,
  completedAt,
  now,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(13,17,23,0.92)] backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold tracking-tight text-[var(--text)]">
              BlackForge AI
            </div>
            <div className="truncate text-[12px] text-[var(--text-muted)]">
              {projectName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-3 text-[12px] text-[var(--text-secondary)] sm:flex">
            <span>
              Status{' '}
              <strong className="font-medium text-[var(--text)]">
                {statusLabel(status)}
              </strong>
            </span>
            <span className="text-[var(--border)]">|</span>
            <span>
              Elapsed{' '}
              <strong className="font-medium text-[var(--text)]">
                {formatElapsed(startedAt, completedAt, now)}
              </strong>
            </span>
            <span className="text-[var(--border)]">|</span>
            <span>
              Run{' '}
              <strong className="mono font-medium text-[var(--text)]">
                {runId ?? '—'}
              </strong>
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
