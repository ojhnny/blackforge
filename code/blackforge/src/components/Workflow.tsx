import { Check, LoaderCircle } from 'lucide-react'
import { formatStageDuration } from '../lib/format'
import type { WorkflowStage, WorkflowStageId } from '../types'

interface WorkflowProps {
  stages: WorkflowStage[]
  selectedStageId: WorkflowStageId | null
  onSelect: (id: WorkflowStageId) => void
  compact?: boolean
}

export function Workflow({
  stages,
  selectedStageId,
  onSelect,
}: WorkflowProps) {
  const selected = stages.find((stage) => stage.id === selectedStageId) ?? null

  return (
    <section className="surface h-full">
      <div className="surface-header">
        <h2 className="section-label">Workflow</h2>
        <span className="meta">Analyze → Verify</span>
      </div>

      <ol>
        {stages.map((stage) => {
          const active = stage.status === 'active'
          const done = stage.status === 'done'
          const pending = stage.status === 'pending'
          const selectedRow = selectedStageId === stage.id

          return (
            <li key={stage.id}>
              <button
                type="button"
                className={`stage-row ${selectedRow ? 'stage-row-active' : ''} ${
                  pending ? 'opacity-45' : ''
                }`}
                onClick={() => onSelect(stage.id)}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      done
                        ? 'border-[rgba(63,185,80,0.35)] text-[var(--success)]'
                        : active
                          ? 'border-[rgba(68,147,248,0.45)] text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                  >
                    {done ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                    ) : active ? (
                      <LoaderCircle className="h-2.5 w-2.5 animate-spin" />
                    ) : null}
                  </span>
                  <span
                    className={`flex-1 text-[13px] ${
                      active
                        ? 'font-medium text-[var(--text)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="meta">
                    {active
                      ? 'running'
                      : done
                        ? formatStageDuration(stage.durationMs)
                        : '—'}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ol>

      {selected && (
        <div className="border-t border-[var(--border-muted)] px-3 py-2.5">
          <div className="meta mb-1">Stage detail</div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {selected.progressLabel ?? selected.detail}
          </p>
        </div>
      )}
    </section>
  )
}
