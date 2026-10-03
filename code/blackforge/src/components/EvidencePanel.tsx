import { useState } from 'react'
import type { Finding, PatchResult, RefereeResult } from '../types'

type Tab = 'reproduction' | 'test' | 'log' | 'stack'

interface EvidencePanelProps {
  finding: Finding | null
  referee: RefereeResult | null
  patchResult: PatchResult | null
  visible: boolean
}

export function EvidencePanel({
  finding,
  referee,
  patchResult,
  visible,
}: EvidencePanelProps) {
  const [tab, setTab] = useState<Tab>('reproduction')

  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Evidence</h2>
        <div className="flex items-center gap-2">
          {visible && referee?.reproduced && (
            <span className="badge badge-danger">FAILED before patch</span>
          )}
          {visible && patchResult?.attack_test_passed && (
            <span className="badge badge-success">PASSED after patch</span>
          )}
        </div>
      </div>

      {!visible || !finding ? (
        <div className="empty">Evidence appears after reproduction.</div>
      ) : (
        <div className="fade-in">
          <div className="tabs">
            {(
              [
                ['reproduction', 'Reproduction'],
                ['test', 'Generated test'],
                ['log', 'Execution log'],
                ['stack', 'Stack trace'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`tab ${tab === id ? 'tab-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-3 sm:p-4">
            {tab === 'reproduction' && (
              <ol className="list-decimal space-y-1.5 pl-4 text-[13px] text-[var(--text-secondary)]">
                {finding.reproduction_steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}

            {tab === 'test' && (
              <div className="code-block">
                <div className="border-b border-[var(--border-muted)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
                  <span className="mono">
                    tests/generated/test_rolling_mean_none.py
                  </span>
                </div>
                <pre>
                  <code>{finding.generated_test}</code>
                </pre>
              </div>
            )}

            {tab === 'log' && (
              <div className="code-block">
                <pre>
                  {referee?.execution_output ??
                    'Waiting for isolated execution output…'}
                </pre>
              </div>
            )}

            {tab === 'stack' && (
              <div className="code-block">
                <pre>
                  {finding.stack_trace ||
                    referee?.execution_output ||
                    'No stack trace captured.'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
