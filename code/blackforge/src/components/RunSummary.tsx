import type { RunSummary as Summary } from '../types'

interface RunSummaryProps {
  summary: Summary | null
  visible: boolean
  durationLabel: string
  testsExecutedHint?: number
}

export function RunSummary({
  summary,
  visible,
  durationLabel,
}: RunSummaryProps) {
  if (!visible || !summary) {
    return (
      <section className="surface">
        <div className="surface-header">
          <h2 className="section-label">Run summary</h2>
          <span className="meta">Executable outcomes only</span>
        </div>
        <div className="empty">Run analysis to populate results.</div>
      </section>
    )
  }

  const cells = [
    { label: 'Findings', value: summary.findings },
    { label: 'Verified', value: summary.verified },
    { label: 'Rejected', value: summary.rejected },
    { label: 'Patches attempted', value: summary.patches_attempted },
    { label: 'Patches accepted', value: summary.patches_accepted },
    { label: 'Regressions introduced', value: summary.regressions_introduced },
    { label: 'Tests executed', value: summary.tests_executed },
    { label: 'Duration', value: durationLabel },
  ]

  return (
    <section className="surface fade-in">
      <div className="surface-header">
        <h2 className="section-label">Run summary</h2>
        <span className="meta">Executable outcomes only</span>
      </div>
      <div className="stat-grid">
        {cells.map((cell) => (
          <div key={cell.label} className="stat-cell">
            <div className="label">{cell.label}</div>
            <div className="value">{cell.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
