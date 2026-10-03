import { Flame, ShieldCheck } from 'lucide-react'
import type { RunPhase } from '../types'

const PHASE_LABEL: Record<RunPhase, string> = {
  idle: 'Standby',
  ingesting: 'Ingesting',
  breaking: 'Break phase',
  reproducing: 'Reproducing',
  fixing: 'Fix phase',
  proving: 'Prove phase',
  complete: 'Forge complete',
}

function phaseClass(phase: RunPhase): string {
  if (phase === 'idle') return 'status-idle'
  if (phase === 'complete' || phase === 'proving') return 'status-prove'
  if (phase === 'fixing') return 'status-fix'
  if (phase === 'breaking' || phase === 'reproducing') return 'status-break'
  return 'status-info'
}

interface HeaderProps {
  phase: RunPhase
  isRunning: boolean
}

export function Header({ phase, isRunning }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(7,9,13,0.92)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(255,92,77,0.35)] bg-[rgba(255,92,77,0.1)]">
            <Flame className="h-4 w-4 text-[var(--break)]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-[1.1rem] font-semibold tracking-tight text-[var(--text)]">
                BlackForge AI
              </h1>
              <span className="hidden font-mono text-[0.68rem] text-[var(--text-dim)] sm:inline">
                v0.1 · forge console
              </span>
            </div>
            <p className="mt-0.5 truncate text-[0.78rem] text-[var(--text-muted)]">
              Break it. Fix it. Prove it.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`status-pill ${phaseClass(phase)}`}>
            {isRunning && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />}
            {PHASE_LABEL[phase]}
          </span>
          <span className="status-pill status-info hidden sm:inline-flex">
            <ShieldCheck className="h-3 w-3" />
            Evidence required
          </span>
        </div>
      </div>
    </header>
  )
}
