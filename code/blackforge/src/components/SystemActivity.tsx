import type { SystemActivity as Activity } from '../types'

interface SystemActivityProps {
  activity: Activity | null
}

export function SystemActivity({ activity }: SystemActivityProps) {
  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="section-label">System activity</h2>
        <span className="meta">Diagnostic</span>
      </div>

      {!activity ? (
        <div className="empty">Unavailable until a run starts.</div>
      ) : (
        <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Discovery model" value={activity.discovery_model} />
          <Item
            label="Verification environment"
            value={activity.verification_environment}
          />
          <Item
            label="Patch attempts"
            value={String(activity.patch_attempts)}
          />
          <Item label="Analysis mode" value={activity.analysis_mode} />
        </dl>
      )}
    </section>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className="text-[13px] text-[var(--text)]">{value}</dd>
    </div>
  )
}
