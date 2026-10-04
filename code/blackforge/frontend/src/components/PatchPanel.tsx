import { useMemo, useState } from 'react'
import type { PatchAttempt, PatchResult } from '../types'

type Tab = 'diff' | 'reasoning' | 'verification'

interface PatchPanelProps {
  patch: PatchAttempt | null
  patchResult: PatchResult | null
  visible: boolean
}

export function PatchPanel({ patch, patchResult, visible }: PatchPanelProps) {
  const [tab, setTab] = useState<Tab>('diff')
  const diffLines = useMemo(
    () => (patch ? buildDiffLines(patch.patch) : []),
    [patch],
  )

  return (
    <section className="surface">
      <div className="surface-header">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="section-label">Patch</h2>
          {visible && patch && (
            <span className="mono meta">{patch.id}</span>
          )}
        </div>
        {visible && patch && (
          <span
            className={`badge ${
              patchResult
                ? patchResult.patch_accepted
                  ? 'badge-success'
                  : 'badge-danger'
                : 'badge-warning'
            }`}
          >
            {patchResult
              ? patchResult.patch_accepted
                ? 'Accepted'
                : 'Rejected'
              : 'Testing'}
          </span>
        )}
      </div>

      {!visible || !patch ? (
        <div className="empty">Patch appears after a verified finding.</div>
      ) : (
        <div className="fade-in">
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[var(--border-muted)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
            <span>
              Files changed{' '}
              <span className="text-[var(--text-secondary)]">
                {patch.files_modified.length}
              </span>
            </span>
            <span>
              Additions{' '}
              <span className="text-[var(--success)]">+{patch.additions}</span>
            </span>
            <span>
              Deletions{' '}
              <span className="text-[var(--danger)]">−{patch.deletions}</span>
            </span>
            <span className="mono">
              {patch.files_modified[0] ?? '—'}
            </span>
          </div>

          <div className="tabs">
            {(
              [
                ['diff', 'Diff'],
                ['reasoning', 'Reasoning'],
                ['verification', 'Verification'],
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

          <div className="p-3">
            {tab === 'diff' && (
              <div className="code-block max-h-[320px]">
                <pre>
                  {diffLines.map((line) => (
                    <div key={line.key} className={`flex ${line.cls}`}>
                      <span className="diff-meta w-8 shrink-0 select-none pr-2 text-right">
                        {line.oldNo ?? ''}
                      </span>
                      <span className="diff-meta w-8 shrink-0 select-none pr-2 text-right">
                        {line.newNo ?? ''}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap">
                        {line.text || ' '}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            )}

            {tab === 'reasoning' && (
              <p className="text-[12px] text-[var(--text-secondary)]">
                {patch.explanation}
              </p>
            )}

            {tab === 'verification' && (
              <div className="space-y-1 text-[12px]">
                {patchResult ? (
                  <>
                    <Row
                      label="Original failing test"
                      value={patchResult.attack_test_passed ? 'PASS' : 'FAIL'}
                      ok={patchResult.attack_test_passed}
                    />
                    <Row
                      label="Regression suite"
                      value={`${patchResult.regression_passed}/${patchResult.regression_total} PASS`}
                      ok={patchResult.regression_tests_passed}
                    />
                    <Row
                      label="Result"
                      value={
                        patchResult.patch_accepted
                          ? 'PATCH ACCEPTED'
                          : 'PATCH REJECTED'
                      }
                      ok={patchResult.patch_accepted}
                    />
                  </>
                ) : (
                  <p className="meta">Verification pending.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Row({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-muted)] py-1.5">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
        {value}
      </span>
    </div>
  )
}

function buildDiffLines(patch: string) {
  let oldNo = 0
  let newNo = 0
  return patch.split('\n').map((text, index) => {
    let cls = ''
    let showOld: number | null = null
    let showNew: number | null = null

    if (text.startsWith('@@')) {
      cls = 'diff-hunk'
      const match = text.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldNo = Number(match[1]) - 1
        newNo = Number(match[2]) - 1
      }
    } else if (text.startsWith('+') && !text.startsWith('+++')) {
      cls = 'diff-add'
      newNo += 1
      showNew = newNo
    } else if (text.startsWith('-') && !text.startsWith('---')) {
      cls = 'diff-del'
      oldNo += 1
      showOld = oldNo
    } else if (text.startsWith('---') || text.startsWith('+++')) {
      cls = 'diff-meta'
    } else if (text.length > 0) {
      oldNo += 1
      newNo += 1
      showOld = oldNo
      showNew = newNo
    }

    return {
      key: `${index}-${text}`,
      text,
      cls,
      oldNo: showOld,
      newNo: showNew,
    }
  })
}
