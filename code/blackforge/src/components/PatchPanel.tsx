import type { PatchAttempt, PatchResult } from '../types'

interface PatchPanelProps {
  patch: PatchAttempt | null
  patchResult: PatchResult | null
  visible: boolean
}

export function PatchPanel({ patch, patchResult, visible }: PatchPanelProps) {
  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">Patch</h2>
        {visible && patch && (
          <span className="meta">
            {patch.files_modified.length} file
            {patch.files_modified.length === 1 ? '' : 's'} changed ·{' '}
            <span className="text-[var(--success)]">+{patch.additions}</span>{' '}
            <span className="text-[var(--danger)]">−{patch.deletions}</span>
          </span>
        )}
      </div>

      {!visible || !patch ? (
        <div className="empty">Patch appears after a verified finding.</div>
      ) : (
        <div className="fade-in space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
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
                  ? 'Patch accepted'
                  : 'Patch rejected'
                : 'Under review'}
            </span>
            {patch.files_modified.map((file) => (
              <span key={file} className="mono meta">
                {file}
              </span>
            ))}
          </div>

          <p className="text-[13px] text-[var(--text-secondary)]">
            {patch.explanation}
          </p>

          <div className="code-block">
            <div className="border-b border-[var(--border-muted)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
              Unified diff
            </div>
            <pre>
              {patch.patch.split('\n').map((line, index) => {
                let cls = ''
                if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-add'
                else if (line.startsWith('-') && !line.startsWith('---'))
                  cls = 'diff-del'
                else if (line.startsWith('@@')) cls = 'diff-hunk'
                return (
                  <div key={index} className={cls}>
                    {line || ' '}
                  </div>
                )
              })}
            </pre>
          </div>
        </div>
      )}
    </section>
  )
}
