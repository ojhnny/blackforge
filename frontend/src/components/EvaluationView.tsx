import { pct, pctDecimal } from '../lib/format'
import type { EvalMetrics, PipelineComparison } from '../types'

interface EvaluationViewProps {
  metrics: EvalMetrics | null
  comparisons: PipelineComparison[]
  hasCompletedRun: boolean
}

export function EvaluationView({
  metrics,
  comparisons,
  hasCompletedRun,
}: EvaluationViewProps) {
  return (
    <div className="space-y-3">
      <section className="surface">
        <div className="surface-header">
          <h2 className="section-label">Evaluation metrics</h2>
          <span className="meta">Benchmark / experiment view</span>
        </div>
        {!hasCompletedRun || !metrics ? (
          <div className="empty">
            Complete a run to populate evaluation metrics from executable outcomes.
          </div>
        ) : (
          <div className="fade-in grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Detection precision" value={pctDecimal(metrics.detection_precision)} />
            <Metric label="Detection recall" value={pctDecimal(metrics.detection_recall)} />
            <Metric label="Reproduction rate" value={pctDecimal(metrics.reproduction_rate)} />
            <Metric label="Patch success rate" value={pctDecimal(metrics.patch_success_rate)} />
            <Metric label="Regression rate" value={pctDecimal(metrics.regression_rate)} />
            <Metric
              label="Mean repair attempts"
              value={metrics.mean_repair_attempts.toFixed(1)}
            />
            <Metric
              label="Mean verification calls"
              value={metrics.mean_verification_calls.toFixed(1)}
            />
            <Metric
              label="Avg cost per finding"
              value={`$${metrics.average_cost_per_finding.toFixed(2)}`}
            />
          </div>
        )}
      </section>

      {metrics?.ranking_enabled && (
        <section className="surface">
          <div className="surface-header">
            <h2 className="section-label">Ranking model</h2>
            <span className="mono meta">{metrics.ranking_model ?? '—'}</span>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-5">
            <Metric label="Framework" value={metrics.ranking_framework ?? '—'} />
            <Metric
              label="Precision"
              value={pctDecimal(metrics.ranking_precision ?? 0)}
            />
            <Metric
              label="Recall"
              value={pctDecimal(metrics.ranking_recall ?? 0)}
            />
            <Metric label="F1" value={pctDecimal(metrics.ranking_f1 ?? 0)} />
            <Metric
              label="ROC-AUC"
              value={pctDecimal(metrics.ranking_roc_auc ?? 0)}
            />
          </div>
        </section>
      )}

      <section className="surface">
        <div className="surface-header">
          <h2 className="section-label">Pipeline comparison</h2>
          <span className="meta">Executable outcomes across configurations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[12px]">
            <thead className="border-b border-[var(--border-muted)] text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Configuration</th>
                <th className="px-3 py-2 font-medium">Reproduction</th>
                <th className="px-3 py-2 font-medium">Patch success</th>
                <th className="px-3 py-2 font-medium">False positive</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-[var(--border-muted)] last:border-0"
                >
                  <td className="px-3 py-2 text-[var(--text)]">{row.name}</td>
                  <td className="px-3 py-2 mono text-[var(--text-secondary)]">
                    {pct(row.reproduction_rate)}
                  </td>
                  <td className="px-3 py-2 mono text-[var(--text-secondary)]">
                    {pct(row.patch_success_rate)}
                  </td>
                  <td className="px-3 py-2 mono text-[var(--text-secondary)]">
                    {pct(row.false_positive_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-muted)] px-3 py-2.5">
      <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-[16px] font-semibold tracking-tight text-[var(--text)]">
        {value}
      </div>
    </div>
  )
}
