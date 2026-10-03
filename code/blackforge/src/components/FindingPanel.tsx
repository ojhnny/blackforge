import { Bug, AlertTriangle } from 'lucide-react'
import type { Finding } from '../types'

interface FindingPanelProps {
  finding: Finding | null
  visible: boolean
}

export function FindingPanel({ finding, visible }: FindingPanelProps) {
  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <Bug className="h-3.5 w-3.5 text-[var(--break)]" />
          Break · Finding
        </div>
        {finding && visible && (
          <span className="status-pill status-break">{finding.severity}</span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {!visible || !finding ? (
          <EmptyState message="Waiting for Red Agent finding…" />
        ) : (
          <div className="animate-fade-up space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.78rem] text-[var(--info)]">{finding.id}</span>
                <span className="status-pill status-idle">{finding.category}</span>
                <span className="font-mono text-[0.68rem] text-[var(--text-dim)]">
                  conf {(finding.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[0.92rem] leading-relaxed text-[var(--text)]">
                {finding.description}
              </p>
            </div>

            <dl className="grid gap-3 md:grid-cols-2">
              <Meta label="File" value={finding.file} mono />
              <Meta
                label="Function"
                value={finding.function_or_query ?? '—'}
                mono
              />
              <Meta label="Location" value={finding.location ?? '—'} mono />
              <Meta label="Trigger" value={finding.triggering_input} mono />
            </dl>

            <div className="grid gap-3">
              <Callout
                tone="expected"
                title="Expected"
                body={finding.expected_behavior}
              />
              <Callout
                tone="observed"
                title="Observed"
                body={finding.observed_behavior}
              />
            </div>
          </div>
        )}
      </div>
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
    <div className="rounded-md border border-[var(--border)] bg-[rgba(5,8,13,0.78)] px-4 py-2.5">
      <dt className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--text-dim)]">
        {label}
      </dt>
      <dd
        className={`mt-1.5 break-all text-[0.82rem] leading-snug text-[var(--accent)] ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function Callout({
  tone,
  title,
  body,
}: {
  tone: 'expected' | 'observed'
  title: string
  body: string
}) {
  const isObserved = tone === 'observed'
  return (
    <div
      className={`rounded-md border px-3 py-2.5 ${
        isObserved
          ? 'border-[rgba(240,68,56,0.35)] bg-[var(--break-soft)]'
          : 'border-[rgba(34,197,94,0.3)] bg-[var(--prove-soft)]'
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em]">
        {isObserved && <AlertTriangle className="h-3 w-3 text-[var(--break)]" />}
        <span className={isObserved ? 'text-[var(--break)]' : 'text-[var(--prove)]'}>
          {title}
        </span>
      </div>
      <p className="text-[0.8rem] leading-relaxed text-[var(--text)]">{body}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[rgba(8,11,16,0.35)] px-4 text-center text-[0.8rem] text-[var(--text-dim)]">
      {message}
    </div>
  )
}
