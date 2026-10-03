import { ChevronDown, ChevronRight } from 'lucide-react'

interface TerminalPanelProps {
  lines: string[]
  open: boolean
  onToggle: (open: boolean) => void
}

export function TerminalPanel({ lines, open, onToggle }: TerminalPanelProps) {
  return (
    <section className="surface">
      <button
        type="button"
        className="surface-header w-full cursor-pointer text-left"
        onClick={() => onToggle(!open)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          )}
          <h2 className="section-label">Execution log</h2>
        </div>
        <span className="meta">{lines.length ? `${lines.length} lines` : 'Collapsed'}</span>
      </button>

      {open && (
        <div className="p-3">
          {lines.length === 0 ? (
            <div className="empty">No execution output yet.</div>
          ) : (
            <div className="code-block max-h-[220px]">
              <pre>
                {lines.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    className={
                      line.includes('FAILED')
                        ? 'text-[var(--danger)]'
                        : line.includes('PASSED') || line.includes('accepted')
                          ? 'text-[var(--success)]'
                          : undefined
                    }
                  >
                    {line}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
