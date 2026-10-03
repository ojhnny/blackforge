import { categoryLabel } from '../data/mock'
import { severityLabel, verificationLabel } from '../lib/format'
import type { Finding } from '../types'

interface FindingsListProps {
  findings: Finding[]
  selectedId: string | null
  visible: boolean
  onSelect: (id: string) => void
}

export function FindingsList({
  findings,
  selectedId,
  visible,
  onSelect,
}: FindingsListProps) {
  return (
    <section className="surface h-full">
      <div className="surface-header">
        <h2 className="section-label">Findings</h2>
        <span className="meta">
          {visible ? `${findings.length} total` : '—'}
        </span>
      </div>

      {!visible || findings.length === 0 ? (
        <div className="empty">No findings yet.</div>
      ) : (
        <div className="fade-in max-h-[420px] overflow-auto">
          {findings.map((finding) => {
            const active = finding.id === selectedId
            return (
              <button
                key={finding.id}
                type="button"
                className={`finding-row ${active ? 'finding-row-active' : ''}`}
                onClick={() => onSelect(finding.id)}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <SeverityBadge severity={finding.severity} />
                  <span className="badge badge-neutral">
                    {categoryLabel(finding.category)}
                  </span>
                  <VerificationBadge state={finding.verification_state} />
                </div>
                <div className="mono text-[12px] text-[var(--text)]">
                  {finding.file}
                  {finding.line != null ? `:${finding.line}` : ''}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  {finding.function_or_query
                    ? `${finding.function_or_query}()`
                    : finding.summary}
                </div>
                <div className="mt-1 meta">
                  Confidence {(finding.confidence * 100).toFixed(0)}%
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SeverityBadge({ severity }: { severity: Finding['severity'] }) {
  const cls =
    severity === 'high'
      ? 'badge-danger'
      : severity === 'medium'
        ? 'badge-warning'
        : 'badge-neutral'
  return <span className={`badge ${cls}`}>{severityLabel(severity)}</span>
}

function VerificationBadge({ state }: { state: Finding['verification_state'] }) {
  const cls =
    state === 'patched' || state === 'verified'
      ? 'badge-success'
      : state === 'not_reproduced' || state === 'rejected'
        ? 'badge-danger'
        : 'badge-neutral'
  return <span className={`badge ${cls}`}>{verificationLabel(state)}</span>
}
