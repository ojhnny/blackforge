import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'
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
  const show = visible && patchResult

  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--prove)]" />
          Prove · Verification
        </div>
        {show && (
          <span
            className={`status-pill ${
              patchResult.patch_accepted ? 'status-prove' : 'status-break'
            }`}
          >
            {patchResult.patch_accepted ? 'Patch accepted' : 'Patch rejected'}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {!show ? (
          <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[rgba(8,11,16,0.35)] px-4 text-center text-[0.8rem] text-[var(--text-dim)]">
            Waiting for referee + verification evidence…
          </div>
        ) : (
          <div className="animate-fade-up space-y-4">
            {referee && (
              <div className="rounded-md border border-[rgba(34,197,94,0.3)] bg-[var(--prove-soft)] px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--prove)]">
                    Failure reproduced
                  </span>
                  <span className="font-mono text-[0.68rem] text-[var(--text-dim)]">
                    {referee.verdict}
                  </span>
                </div>
                <p className="text-[0.8rem] leading-relaxed text-[var(--text)]">
                  {referee.evidence}
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <CheckRow
                label="Attack test"
                ok={patchResult.attack_test_passed}
              />
              <CheckRow
                label="Regression"
                ok={patchResult.regression_tests_passed}
                hint="clean"
              />
              <CheckRow
                label="Static checks"
                ok={patchResult.static_checks_passed}
              />
            </div>

            {referee && (
              <div className="code-panel">
                <div className="border-b border-[#1c2635] px-3 py-1.5 font-mono text-[0.65rem] text-[var(--text-dim)]">
                  referee execution_output
                </div>
                <pre className="max-h-[200px] text-[0.72rem] text-[#b7c3d4]">
                  {referee.execution_output}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function CheckRow({
  label,
  ok,
  hint,
}: {
  label: string
  ok: boolean
  hint?: string
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2.5 ${
        ok
          ? 'border-[rgba(34,197,94,0.3)] bg-[var(--prove-soft)]'
          : 'border-[rgba(240,68,56,0.3)] bg-[var(--break-soft)]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--prove)]" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-[var(--break)]" />
        )}
        <span className="text-[0.78rem] font-medium text-[var(--text)]">{label}</span>
      </div>
      <p className="mt-1 font-mono text-[0.68rem] text-[var(--text-dim)]">
        {ok ? (hint ? `passed · ${hint}` : 'passed') : 'failed'}
      </p>
    </div>
  )
}
