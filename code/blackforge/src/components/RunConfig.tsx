import { Play, RotateCcw } from 'lucide-react'
import {
  ANALYSIS_MODES,
  CATEGORY_OPTIONS,
  ENVIRONMENTS,
} from '../data/mock'
import type { BugCategory, RunConfig as Config, TargetRepo } from '../types'

interface RunConfigProps {
  repos: TargetRepo[]
  config: Config
  isRunning: boolean
  onChange: (partial: Partial<Config>) => void
  onToggleCategory: (category: BugCategory) => void
  onStart: () => void
  onReset: () => void
}

export function RunConfig({
  repos,
  config,
  isRunning,
  onChange,
  onToggleCategory,
  onStart,
  onReset,
}: RunConfigProps) {
  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Run configuration</h2>
        <span className="meta">Evidence required for every finding</span>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <label>
          <span className="field-label">Repository</span>
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
        </label>

        <label>
          <span className="field-label">Branch</span>
          <input
            className="control"
            disabled={isRunning}
            value={config.branch}
            onChange={(event) => onChange({ branch: event.target.value })}
          />
        </label>

        <label>
          <span className="field-label">Commit</span>
          <input
            className="control mono"
            disabled={isRunning}
            value={config.commit}
            onChange={(event) => onChange({ commit: event.target.value })}
          />
        </label>

        <label>
          <span className="field-label">Analysis mode</span>
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
        </label>

        <div>
          <span className="field-label">Bug categories</span>
          <div className="flex flex-wrap gap-2 pt-0.5">
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
          </div>
        </div>

        <label>
          <span className="field-label">Execution environment</span>
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
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-muted)] px-4 py-3">
        <button
          type="button"
          className="btn btn-primary"
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
    </section>
  )
}
