import type { RunStatus, Severity, VerificationState } from '../types'

export function formatElapsed(
  startedAt: number | null,
  endedAt: number | null,
  now: number,
): string {
  if (!startedAt) return '—'
  const end = endedAt ?? now
  const totalSeconds = Math.max(0, Math.floor((end - startedAt) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function statusLabel(status: RunStatus): string {
  switch (status) {
    case 'idle':
      return 'Idle'
    case 'running':
      return 'Running'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
  }
}

export function severityLabel(severity: Severity): string {
  switch (severity) {
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
  }
}

export function verificationLabel(state: VerificationState): string {
  switch (state) {
    case 'pending':
      return 'Pending'
    case 'verified':
      return 'Verified'
    case 'not_reproduced':
      return 'Not reproduced'
    case 'rejected':
      return 'Rejected'
    case 'patched':
      return 'Patched'
  }
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}
