import type { RunError } from '../types'

interface FailedRunProps {
  error: RunError
  runId: string | null
  onRetry: () => void
  onViewLogs: () => void
}

export function FailedRun({
  error,
  runId,
  onRetry,
  onViewLogs,
}: FailedRunProps) {
  return (
    <section className="surface border-[rgba(248,81,73,0.35)]">
      <div className="surface-header">
        <h2 className="section-label">Analysis failed</h2>
        <span className="mono meta">{runId ?? '—'}</span>
      </div>
      <div className="space-y-3 p-3">
        <p className="text-[13px] text-[var(--text)]">{error.message}</p>
        <div className="kv-grid">
          <div>
            <div className="field-label">Error</div>
            <div className="text-[12px] text-[var(--text)]">{error.detail}</div>
          </div>
          <div>
            <div className="field-label">Stage</div>
            <div className="text-[12px] capitalize text-[var(--text)]">
              {error.stage}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
          <button type="button" className="btn btn-secondary" onClick={onViewLogs}>
            View logs
          </button>
        </div>
      </div>
    </section>
  )
}
