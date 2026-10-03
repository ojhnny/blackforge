import type { Finding } from '../types'

interface FindingDetailProps {
  finding: Finding | null
  visible: boolean
}

export function FindingDetail({ finding, visible }: FindingDetailProps) {
  return (
    <section className="surface h-full">
      <div className="surface-header">
        <h2 className="section-label">Finding detail</h2>
        {finding && visible && (
          <span className="mono meta">{finding.id}</span>
        )}
      </div>

      {!visible || !finding ? (
        <div className="empty">Select a finding to inspect evidence.</div>
      ) : (
        <div className="fade-in space-y-4 p-4">
          <section>
            <h3 className="field-label">Summary</h3>
            <p className="text-[13px] text-[var(--text)]">{finding.summary}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Meta
              label="File"
              value={finding.file}
              mono
            />
            <Meta
              label="Line"
              value={finding.line != null ? String(finding.line) : '—'}
              mono
            />
            <Meta
              label="Function"
              value={finding.function_or_query ? `${finding.function_or_query}()` : '—'}
              mono
            />
          </section>

          <section>
            <h3 className="field-label">Trigger</h3>
            <div className="code-block">
              <pre>{finding.triggering_input}</pre>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-[var(--radius)] border border-[var(--border-muted)] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                <h3 className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Expected
                </h3>
              </div>
              <p className="text-[13px] text-[var(--text)]">
                {finding.expected_behavior}
              </p>
            </section>
            <section className="rounded-[var(--radius)] border border-[var(--border-muted)] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                <h3 className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Observed
                </h3>
              </div>
              <p className="text-[13px] text-[var(--text)]">
                {finding.observed_behavior}
              </p>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-muted)] px-3 py-2">
      <div className="field-label mb-1">{label}</div>
      <div className={`text-[13px] text-[var(--text)] ${mono ? 'mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}
