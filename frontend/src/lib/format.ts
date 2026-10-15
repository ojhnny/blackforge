import type { RunStatus, Severity, VerificationState } from '../types'

export function formatElapsed(
  startedAt: number | null,
  endedAt: number | null,
  now: number,
): string {
  if (!startedAt) return '—'
  const end = endedAt ?? now
  const ms = Math.max(0, end - startedAt)
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds - minutes * 60
  return `${minutes}m ${rem.toFixed(1)}s`
}

export function formatStageDuration(ms: number | null): string {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(1)}s`
}

export function statusLabel(status: RunStatus): string {
  switch (status) {
    case 'idle':
      return 'Idle'
    case 'running':
      return 'Analyzing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
  }
}

export function severityLabel(severity: Severity): string {
  switch (severity) {
    case 'high':
      return 'HIGH'
    case 'medium':
      return 'MEDIUM'
    case 'low':
      return 'LOW'
  }
}

export function verificationLabel(state: VerificationState): string {
  switch (state) {
    case 'pending_verification':
      return 'Pending verification'
    case 'verifying':
      return 'Verifying'
    case 'verified':
      return 'Verified'
    case 'not_reproduced':
      return 'Not reproduced'
    case 'patch_accepted':
      return 'Patch accepted'
    case 'patch_rejected':
      return 'Patch rejected'
  }
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

export function pctDecimal(value: number | null): string {
  return value == null ? '—' : value.toFixed(2)
}

export function fixed1(value: number | null): string {
  return value == null ? '—' : value.toFixed(1)
}
