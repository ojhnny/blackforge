import { Play, RotateCcw, FolderGit2 } from 'lucide-react'
import type { TargetRepo } from '../types'

interface ForgeConsoleProps {
  repos: TargetRepo[]
  selectedRepoId: string
  isRunning: boolean
  phaseLabel: string
  onSelectRepo: (id: string) => void
  onStart: () => void
  onReset: () => void
}

export function ForgeConsole({
  repos,
  selectedRepoId,
  isRunning,
  phaseLabel,
  onSelectRepo,
  onStart,
  onReset,
}: ForgeConsoleProps) {
  const selected = repos.find((repo) => repo.id === selectedRepoId) ?? repos[0]

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <FolderGit2 className="h-3.5 w-3.5 text-[var(--info)]" />
          Forge Console
        </div>
        <span className="font-mono text-[0.68rem] text-[var(--text-dim)]">{phaseLabel}</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Target repository
            </span>
            <select
              value={selectedRepoId}
              disabled={isRunning}
              onChange={(event) => onSelectRepo(event.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2.5 font-mono text-[0.84rem] text-[var(--text)] outline-none transition focus:border-[var(--info)] disabled:opacity-50"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.path}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-md border border-[var(--border)] bg-[rgba(8,11,16,0.65)] px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[0.78rem] text-[var(--accent)]">{selected.name}</span>
              <span className="status-pill status-idle">{selected.category}</span>
            </div>
            <p className="text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
              {selected.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.68rem] text-[var(--text-dim)]">
              <span>{selected.language}</span>
              <span>{selected.files} files</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--break)] px-3.5 py-2 text-[0.84rem] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            Start forge run
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-3.5 py-2 text-[0.84rem] font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <p className="ml-0 text-[0.75rem] text-[var(--text-dim)] sm:ml-2">
            Simulated loop · Red → Referee → Blue → Prove
          </p>
        </div>
      </div>
    </section>
  )
}
