import { Check, LoaderCircle } from 'lucide-react'
import type { WorkflowStage } from '../types'

interface WorkflowProps {
  stages: WorkflowStage[]
}

function formatMs(ms: number | null): string {
  if (ms == null) return ''
  return `${(ms / 1000).toFixed(1)}s`
}

export function Workflow({ stages }: WorkflowProps) {
  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Workflow</h2>
        <span className="meta">
          Analyze → Discover → Reproduce → Patch → Verify
        </span>
      </div>

      <ol className="divide-y divide-[var(--border-muted)]">
        {stages.map((stage) => {
          const active = stage.status === 'active'
          const done = stage.status === 'done'
          const pending = stage.status === 'pending'

          return (
            <li
              key={stage.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                pending ? 'opacity-45' : 'opacity-100'
              } ${active ? 'bg-[rgba(68,147,248,0.06)]' : ''}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  done
                    ? 'border-[rgba(63,185,80,0.4)] text-[var(--success)]'
                    : active
                      ? 'border-[rgba(68,147,248,0.5)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : active ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-[13px] font-medium ${
                      active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="meta">
                    {active ? 'in progress' : done ? formatMs(stage.durationMs) : '—'}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  {stage.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
