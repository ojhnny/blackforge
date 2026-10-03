import { GitBranch } from 'lucide-react'
import type { PatchAttempt } from '../types'

interface DiffViewerProps {
  patch: PatchAttempt | null
  visible: boolean
}

export function DiffViewer({ patch, visible }: DiffViewerProps) {
  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <GitBranch className="h-3.5 w-3.5 text-[var(--fix)]" />
          Fix · Patch Diff
        </div>
        {visible && patch && (
          <span className="status-pill status-fix">minimal patch</span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        {!visible || !patch ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[rgba(8,11,16,0.35)] px-4 text-center text-[0.8rem] text-[var(--text-dim)]">
            Waiting for Blue Agent patch…
          </div>
        ) : (
          <div className="animate-fade-up space-y-3">
            <p className="text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
              {patch.explanation}
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-[0.68rem] text-[var(--text-dim)]">
              {patch.files_modified.map((file) => (
                <span
                  key={file}
                  className="rounded border border-[var(--border)] bg-[rgba(8,11,16,0.65)] px-2 py-1 text-[var(--accent)]"
                >
                  {file}
                </span>
              ))}
            </div>
            <div className="code-panel">
              <div className="border-b border-[#243246] px-3 py-1.5 font-mono text-[0.65rem] text-[var(--text-dim)]">
                unified diff
              </div>
              <pre className="max-h-[320px]">
                {patch.patch.split('\n').map((line, index) => {
                  let color = 'text-[#dce5f2]'
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    color = 'text-[#8ff0c0] bg-[rgba(52,211,153,0.12)]'
                  } else if (line.startsWith('-') && !line.startsWith('---')) {
                    color = 'text-[#ffb0a8] bg-[rgba(255,92,77,0.12)]'
                  } else if (line.startsWith('@@')) {
                    color = 'text-[var(--info)]'
                  } else if (line.startsWith('---') || line.startsWith('+++')) {
                    color = 'text-[var(--text-dim)]'
                  }
                  return (
                    <div key={index} className={`${color} px-1.5`}>
                      {line || ' '}
                    </div>
                  )
                })}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
