import { categoryLabel } from '../data/mock'
import { severityLabel, verificationLabel } from '../lib/format'
import type { Finding } from '../types'

interface FindingsListProps {
  findings: Finding[]
  selectedId: string | null
  visible: boolean
  testsExecuted: number | null
  onSelect: (id: string) => void
}

export function FindingsList({
  findings,
  selectedId,
  visible,
  testsExecuted,
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

      {!visible ? (
        <div className="empty">Findings appear after discovery.</div>
      ) : findings.length === 0 ? (
        <div className="empty">
          <div className="mb-1 text-[var(--text-secondary)]">
            No reproducible defects found.
          </div>
          <div className="meta">
            {testsExecuted ?? 0} tests executed · 0 verified findings
          </div>
        </div>
      ) : (
        <div className="fade-in max-h-[440px] overflow-auto">
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
                <div className="mono mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  {finding.function_or_query
                    ? `${finding.function_or_query}()`
                    : '—'}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="meta">
                    Confidence {(finding.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="mono meta">{finding.id}</span>
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
    state === 'patch_accepted' || state === 'verified'
      ? 'badge-success'
      : state === 'not_reproduced' || state === 'patch_rejected'
        ? 'badge-danger'
      : state === 'verifying'
        ? 'badge-info'
        : 'badge-warning'
  return <span className={`badge ${cls}`}>{verificationLabel(state)}</span>
}
