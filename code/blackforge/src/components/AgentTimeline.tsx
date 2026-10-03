import { Check, Circle, LoaderCircle } from 'lucide-react'
import type { TimelineStep } from '../types'

interface AgentTimelineProps {
  steps: TimelineStep[]
}

function phaseTone(phase: TimelineStep['phase']): string {
  if (phase === 'break') return 'text-[var(--break)]'
  if (phase === 'fix') return 'text-[var(--fix)]'
  if (phase === 'prove') return 'text-[var(--prove)]'
  return 'text-[var(--info)]'
}

export function AgentTimeline({ steps }: AgentTimelineProps) {
  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" />
          Agent Timeline
        </div>
        <span className="font-mono text-[0.68rem] text-[var(--text-dim)]">
          {steps.filter((s) => s.status === 'done').length}/{steps.length}
        </span>
      </div>

      <ol className="space-y-0 p-3 sm:p-4">
        {steps.map((step, index) => {
          const isActive = step.status === 'active'
          const isDone = step.status === 'done'
          const isPending = step.status === 'pending'

          return (
            <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < steps.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${
                    isDone ? 'bg-[var(--border-strong)]' : 'bg-[var(--border)]'
                  }`}
                />
              )}

              <span
                className={`relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${
                  isDone
                    ? 'border-[rgba(34,197,94,0.45)] bg-[var(--prove-soft)] text-[var(--prove)]'
                    : isActive
                      ? 'border-[rgba(56,189,248,0.5)] bg-[var(--info-soft)] text-[var(--info)]'
                      : 'border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-dim)]'
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : isActive ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Circle className="h-2.5 w-2.5" strokeWidth={2.5} />
                )}
              </span>

              <div className={`min-w-0 flex-1 ${isPending ? 'opacity-45' : 'opacity-100'}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[0.84rem] font-medium text-[var(--text)]">
                    {step.label}
                  </span>
                  <span
                    className={`font-mono text-[0.62rem] uppercase tracking-[0.08em] ${phaseTone(step.phase)}`}
                  >
                    {step.phase}
                  </span>
                </div>
                <p className="mt-0.5 text-[0.76rem] leading-relaxed text-[var(--text-muted)]">
                  {step.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
