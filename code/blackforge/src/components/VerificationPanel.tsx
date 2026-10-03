import type { PatchResult, RefereeResult } from '../types'

interface VerificationPanelProps {
  referee: RefereeResult | null
  patchResult: PatchResult | null
  visible: boolean
}

export function VerificationPanel({
  referee,
  patchResult,
  visible,
}: VerificationPanelProps) {
  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Verification</h2>
        {visible && patchResult && (
          <span
            className={`badge ${
              patchResult.patch_accepted ? 'badge-success' : 'badge-danger'
            }`}
          >
            {patchResult.patch_accepted ? 'Patch accepted' : 'Patch rejected'}
          </span>
        )}
      </div>

      {!visible || !patchResult ? (
        <div className="empty">
          Verification results appear after patch execution.
        </div>
      ) : (
        <div className="fade-in space-y-3 p-4">
          {referee && (
            <p className="text-[13px] text-[var(--text-secondary)]">
              {referee.evidence}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Result
              label="Original failing test"
              value={patchResult.attack_test_passed ? 'PASS' : 'FAIL'}
              ok={patchResult.attack_test_passed}
            />
            <Result
              label="Regression suite"
              value={`${patchResult.regression_passed}/${patchResult.regression_total} PASS`}
              ok={patchResult.regression_tests_passed}
            />
            <Result
              label="Static checks"
              value={patchResult.static_checks_passed ? 'PASS' : 'FAIL'}
              ok={patchResult.static_checks_passed}
            />
            <Result
              label="New failures"
              value={String(patchResult.new_failures.length)}
              ok={patchResult.new_failures.length === 0}
            />
          </div>

          {!patchResult.patch_accepted && patchResult.rejection_reason && (
            <div className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--text)]">
              Rejection reason: {patchResult.rejection_reason}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Result({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-muted)] px-3 py-2.5">
      <div className="text-[12px] text-[var(--text-muted)]">{label}</div>
      <div
        className={`mt-1 text-[13px] font-semibold ${
          ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
