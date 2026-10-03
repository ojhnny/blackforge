import { TerminalSquare } from 'lucide-react'

interface TerminalPanelProps {
  lines: string[]
  visible: boolean
}

export function TerminalPanel({ lines, visible }: TerminalPanelProps) {
  const show = visible && lines.length > 0

  return (
    <section className="panel h-full">
      <div className="panel-header">
        <div className="panel-title">
          <TerminalSquare className="h-3.5 w-3.5 text-[var(--info)]" />
          Execution Terminal
        </div>
        <span className="font-mono text-[0.68rem] text-[var(--text-dim)]">
          docker · pytest
        </span>
      </div>
      <div className="p-3 sm:p-4">
        {!show ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[rgba(8,11,16,0.35)] px-4 text-center text-[0.8rem] text-[var(--text-dim)]">
            Terminal idle — start a forge run to stream evidence.
          </div>
        ) : (
          <div className="code-panel min-h-[180px]">
            <div className="flex items-center gap-1.5 border-b border-[#1c2635] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3a4556]" />
              <span className="h-2 w-2 rounded-full bg-[#3a4556]" />
              <span className="h-2 w-2 rounded-full bg-[#3a4556]" />
              <span className="ml-2 font-mono text-[0.65rem] text-[var(--text-dim)]">
                blackforge-exec
              </span>
            </div>
            <pre className="max-h-[280px] space-y-1">
              {lines.map((line, index) => (
                <div
                  key={`${index}-${line}`}
                  className={`animate-terminal-in ${
                    line.includes('FAILED') || line.includes('FAILURE')
                      ? 'text-[var(--break)]'
                      : line.includes('PASSED') || line.includes('ACCEPTED')
                        ? 'text-[var(--prove)]'
                        : line.startsWith('$')
                          ? 'text-[var(--info)]'
                          : 'text-[#c7d2e0]'
                  }`}
                  style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                >
                  {line}
                </div>
              ))}
              <div className="text-[var(--text-dim)]">█</div>
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}
