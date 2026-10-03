import { Activity } from 'lucide-react'
import type { ForgeMetrics } from '../types'

interface MetricsPanelProps {
  metrics: ForgeMetrics | null
  visible: boolean
}

export function MetricsPanel({ metrics, visible }: MetricsPanelProps) {
  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <Activity className="h-3.5 w-3.5 text-[var(--info)]" />
          Metrics
        </div>
        {visible && metrics && (
          <span className="status-pill status-prove">Forge run complete</span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {!visible || !metrics ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[rgba(8,11,16,0.35)] px-4 text-center text-[0.8rem] text-[var(--text-dim)]">
            Metrics appear after verification.
          </div>
        ) : (
          <div className="animate-fade-up grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Reproduction rate"
              value={pct(metrics.reproduction_rate)}
              tone="prove"
            />
            <Metric
              label="Patch acceptance"
              value={pct(metrics.patch_acceptance_rate)}
              tone="prove"
            />
            <Metric
              label="Regression pass"
              value={pct(metrics.regression_pass_rate)}
              tone="prove"
            />
            <Metric
              label="False positive"
              value={pct(metrics.false_positive_rate)}
              tone="idle"
            />
            <Metric
              label="Proposals"
              value={String(metrics.bug_proposal_count)}
              tone="info"
            />
            <Metric
              label="Avg time"
              value={`${metrics.avg_time_seconds.toFixed(1)}s`}
              tone="info"
            />
            <Metric
              label="Cost / verified patch"
              value={`$${metrics.cost_per_verified_patch.toFixed(2)}`}
              tone="fix"
            />
          </div>
        )}
      </div>
    </section>
  )
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'prove' | 'fix' | 'info' | 'idle'
}) {
  const valueColor =
    tone === 'prove'
      ? 'text-[var(--prove)]'
      : tone === 'fix'
        ? 'text-[var(--fix)]'
        : tone === 'info'
          ? 'text-[var(--info)]'
          : 'text-[var(--text)]'

  return (
    <div className="rounded-md border border-[var(--border)] bg-[rgba(8,11,16,0.55)] px-3 py-3">
      <div className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--text-dim)]">
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-[1.35rem] font-semibold tracking-tight ${valueColor}`}>
        {value}
      </div>
    </div>
  )
}
