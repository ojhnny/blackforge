import { Play, RotateCcw } from 'lucide-react'
import {
  ANALYSIS_MODES,
  CATEGORY_OPTIONS,
  ENVIRONMENTS,
} from '../data/mock'
import type { BugCategory, RunConfig as Config, TargetRepo } from '../types'
import type { ReactNode } from 'react'

interface RunConfigProps {
  repos: TargetRepo[]
  config: Config
  isRunning: boolean
  progressMessage: string | null
  onChange: (partial: Partial<Config>) => void
  onToggleCategory: (category: BugCategory) => void
  onStart: () => void
  onReset: () => void
}

export function RunConfig({
  repos,
  config,
  isRunning,
  progressMessage,
  onChange,
  onToggleCategory,
  onStart,
  onReset,
}: RunConfigProps) {
  const modeLabel =
    ANALYSIS_MODES.find((mode) => mode.id === config.mode)?.label ?? '—'
  const envLabel =
    ENVIRONMENTS.find((env) => env.id === config.environment)?.label ?? '—'

  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Run configuration</h2>
        {progressMessage ? (
          <span className="meta">{progressMessage}</span>
        ) : (
          <span className="meta">Evidence required for every finding</span>
        )}
      </div>

      <div className="grid gap-x-4 gap-y-3 p-3 md:grid-cols-3 lg:grid-cols-6">
        <Field label="Repository">
          <select
            className="control"
            disabled={isRunning}
            value={config.repoId}
            onChange={(event) => onChange({ repoId: event.target.value })}
          >
            {repos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.path}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Branch">
          <input
            className="control"
            disabled={isRunning}
            value={config.branch}
            onChange={(event) => onChange({ branch: event.target.value })}
          />
        </Field>

        <Field label="Commit">
          <input
            className="control mono"
            disabled={isRunning}
            value={config.commit}
            onChange={(event) => onChange({ commit: event.target.value })}
          />
        </Field>

        <Field label="Environment">
          <select
            className="control"
            disabled={isRunning}
            value={config.environment}
            onChange={(event) =>
              onChange({
                environment: event.target.value as Config['environment'],
              })
            }
          >
            {ENVIRONMENTS.map((env) => (
              <option key={env.id} value={env.id}>
                {env.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mode">
          <select
            className="control"
            disabled={isRunning}
            value={config.mode}
            onChange={(event) =>
              onChange({ mode: event.target.value as Config['mode'] })
            }
          >
            {ANALYSIS_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-end gap-2">
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={isRunning}
            onClick={onStart}
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            Run Analysis
          </button>
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-muted)] px-3 py-2">
        <span className="meta">Analysis categories</span>
        {CATEGORY_OPTIONS.map((category) => {
          const active = config.categories.includes(category.id)
          return (
            <button
              key={category.id}
              type="button"
              disabled={isRunning}
              onClick={() => onToggleCategory(category.id)}
              className={`badge ${active ? 'badge-info' : 'badge-neutral'}`}
            >
              {category.label}
            </button>
          )
        })}
        <span className="meta ml-auto hidden sm:inline">
          {envLabel} · {modeLabel}
        </span>
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block min-w-0">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}
