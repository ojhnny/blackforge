import { FileCode2 } from 'lucide-react'

interface TestViewerProps {
  code: string | null
  visible: boolean
}

export function TestViewer({ code, visible }: TestViewerProps) {
  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <FileCode2 className="h-3.5 w-3.5 text-[var(--break)]" />
          Break · Generated Test
        </div>
        {visible && code && (
          <span className="font-mono text-[0.68rem] text-[var(--text-dim)]">
            test_rolling_mean_none.py
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        {!visible || !code ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[rgba(8,11,16,0.35)] px-4 text-center text-[0.8rem] text-[var(--text-dim)]">
            Waiting for executable reproduction case…
          </div>
        ) : (
          <div className="code-panel animate-fade-up">
            <div className="flex items-center justify-between border-b border-[#243246] px-3 py-1.5">
              <span className="font-mono text-[0.65rem] text-[var(--text-dim)]">pytest</span>
              <span className="status-pill status-break">failing</span>
            </div>
            <pre>
              <code className="text-[#e4ebf5]">{code}</code>
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}
