import { ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { useState } from 'react'

interface TerminalPanelProps {
  lines: string[]
  open: boolean
  onToggle: (open: boolean) => void
}

export function TerminalPanel({ lines, open, onToggle }: TerminalPanelProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const copyLog = async () => {
    if (!lines.length) return
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <section className="surface">
      <div className="surface-header">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => onToggle(!open)}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          )}
          <h2 className="section-label">Execution log</h2>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost px-2 py-1 text-[11px]"
            onClick={copyLog}
            disabled={!lines.length}
          >
            <Copy className="h-3 w-3" />
            {copied ? 'Copied' : 'Copy log'}
          </button>
          <button
            type="button"
            className="btn btn-ghost px-2 py-1 text-[11px]"
            onClick={() => {
              onToggle(true)
              setExpanded((value) => !value)
            }}
            disabled={!lines.length}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3">
          {lines.length === 0 ? (
            <div className="empty">No execution output yet.</div>
          ) : (
            <div className={`code-block ${expanded ? 'max-h-[420px]' : 'max-h-[180px]'}`}>
              <pre>
                {lines.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    className={
                      line === 'FAILED'
                        ? 'text-[var(--danger)]'
                        : line === 'PASSED' || line.includes('accepted')
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
