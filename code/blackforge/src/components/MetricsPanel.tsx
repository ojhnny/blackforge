import { pct } from '../lib/format'
import type { EvalMetrics } from '../types'

interface MetricsPanelProps {
  metrics: EvalMetrics | null
  visible: boolean
}

export function MetricsPanel({ metrics, visible }: MetricsPanelProps) {
  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Evaluation metrics</h2>
        <span className="meta">Benchmark run</span>
      </div>

      {!visible || !metrics ? (
        <div className="empty">Metrics appear after verification.</div>
      ) : (
        <div className="fade-in space-y-4 p-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Detection precision" value={pct(metrics.detection_precision)} />
            <Metric label="Detection recall" value={pct(metrics.detection_recall)} />
            <Metric label="Reproduction rate" value={pct(metrics.reproduction_rate)} />
            <Metric label="Patch success rate" value={pct(metrics.patch_success_rate)} />
            <Metric label="Regression rate" value={pct(metrics.regression_rate)} />
            <Metric
              label="Mean repair attempts"
              value={metrics.mean_repair_attempts.toFixed(1)}
            />
          </div>

          {metrics.ranking_enabled && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Ranking model
                </h3>
                <span className="meta">{metrics.ranking_model}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <Metric
                  label="Precision"
                  value={pct(metrics.ranking_precision ?? 0)}
                />
                <Metric
                  label="Recall"
                  value={pct(metrics.ranking_recall ?? 0)}
                />
                <Metric label="F1" value={pct(metrics.ranking_f1 ?? 0)} />
                <Metric
                  label="ROC-AUC"
                  value={(metrics.ranking_roc_auc ?? 0).toFixed(2)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
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
