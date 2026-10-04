import { Check } from 'lucide-react'
import { categoryLabel } from '../data/mock'
import { severityLabel, verificationLabel } from '../lib/format'
import type { Finding, PatchResult } from '../types'

interface FindingDetailProps {
  finding: Finding | null
  patchResult: PatchResult | null
  visible: boolean
}

export function FindingDetail({
  finding,
  patchResult,
  visible,
}: FindingDetailProps) {
  return (
    <section className="surface h-full">
      <div className="surface-header">
        <h2 className="section-label">Finding detail</h2>
      </div>

      {!visible ? (
        <div className="empty">Findings appear after discovery.</div>
      ) : !finding ? (
        <div className="empty">Select a finding to inspect evidence.</div>
      ) : (
        <div className="fade-in space-y-4 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mono text-[12px] text-[var(--text-secondary)]">
              {finding.id}
            </span>
            <span
              className={`badge ${
                finding.severity === 'high'
                  ? 'badge-danger'
                  : finding.severity === 'medium'
                    ? 'badge-warning'
                    : 'badge-neutral'
              }`}
            >
              {severityLabel(finding.severity)}
            </span>
            <span className="badge badge-neutral">
              {categoryLabel(finding.category)}
            </span>
            <span
              className={`badge ${
                finding.verification_state === 'patch_accepted' ||
                finding.verification_state === 'verified'
                  ? 'badge-success'
                  : finding.verification_state === 'not_reproduced' ||
                      finding.verification_state === 'patch_rejected'
                    ? 'badge-danger'
                    : 'badge-warning'
              }`}
            >
              {verificationLabel(finding.verification_state)}
            </span>
          </div>

          <section>
            <h3 className="field-label">Summary</h3>
            <p className="text-[13px] text-[var(--text)]">{finding.summary}</p>
          </section>

          <div className="kv-grid">
            <Meta label="File" value={finding.file} mono />
            <Meta
              label="Line"
              value={finding.line != null ? String(finding.line) : '—'}
              mono
            />
            <Meta
              label="Function"
              value={
                finding.function_or_query
                  ? `${finding.function_or_query}()`
                  : '—'
              }
              mono
            />
            <Meta
              label="Confidence"
              value={`${(finding.confidence * 100).toFixed(0)}%`}
            />
          </div>

          {finding.ranking_score != null && (
            <div className="rounded-[var(--radius)] border border-[var(--border-muted)] px-3 py-2">
              <div className="meta mb-1">Finding ranking</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--text-secondary)]">
                <span>
                  Model <span className="mono text-[var(--text)]">finding-ranker-v1</span>
                </span>
                <span>
                  Framework <span className="text-[var(--text)]">PyTorch</span>
                </span>
                <span>
                  Score{' '}
                  <span className="mono text-[var(--text)]">
                    {finding.ranking_score.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          )}

          <section>
            <h3 className="field-label">Trigger</h3>
            <div className="code-block">
              <pre>{finding.triggering_input}</pre>
            </div>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <section className="rounded-[var(--radius)] border border-[var(--border-muted)] p-2.5">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                <h3 className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Expected
                </h3>
              </div>
              <p className="text-[12px] text-[var(--text)]">
                {finding.expected_behavior}
              </p>
            </section>
            <section className="rounded-[var(--radius)] border border-[var(--border-muted)] p-2.5">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                <h3 className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Observed
                </h3>
              </div>
              <p className="whitespace-pre-wrap text-[12px] text-[var(--text)]">
                {finding.observed_behavior}
              </p>
            </section>
          </div>

          {(finding.verification_state === 'verified' ||
            finding.verification_state === 'patch_accepted' ||
            finding.verification_state === 'patch_rejected') &&
            patchResult &&
            patchResult.finding_id === finding.id && (
              <VerificationBlock result={patchResult} />
            )}
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
    <div>
      <div className="field-label">{label}</div>
      <div className={`text-[12px] text-[var(--text)] ${mono ? 'mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function VerificationBlock({ result }: { result: PatchResult }) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="section-label">Verification</h3>
        <span
          className={`badge ${
            result.patch_accepted ? 'badge-success' : 'badge-danger'
          }`}
        >
          {result.patch_accepted ? 'PATCH ACCEPTED' : 'PATCH REJECTED'}
        </span>
      </div>

      <div className="grid gap-1.5 text-[12px]">
        <CheckLine label="Reproduced" ok={result.reproduced} />
        <CheckLine label="Generated test" ok={result.generated_test} />
        <CheckLine label="Patch applied" ok={result.patch_applied} />
        <CheckLine
          label="Original failing test"
          value={result.attack_test_passed ? 'PASS' : 'FAIL'}
          ok={result.attack_test_passed}
        />
        <CheckLine
          label="Regression suite"
          value={`${result.regression_passed} / ${result.regression_total} PASS`}
          ok={result.regression_tests_passed}
        />
        <CheckLine
          label="Static checks"
          value={result.static_checks_passed ? 'PASS' : 'FAIL'}
          ok={result.static_checks_passed}
        />
        <CheckLine
          label="New failures"
          value={String(result.new_failures.length)}
          ok={result.new_failures.length === 0}
        />
      </div>

      {!result.patch_accepted && result.rejection_reason && (
        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
          {result.rejection_reason}
        </p>
      )}
    </section>
  )
}

function CheckLine({
  label,
  value,
  ok,
}: {
  label: string
  value?: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-muted)] py-1.5 last:border-0">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-medium ${
          ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'
        }`}
      >
        {ok && !value ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
        {value ?? (ok ? '✓' : '✗')}
      </span>
    </div>
  )
}
