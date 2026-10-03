export type BugCategory =
  | 'python_logic'
  | 'data_sql'
  | 'ml_pipeline'
  | 'api'
  | 'config'

export type Severity = 'low' | 'medium' | 'high'

export type RunPhase =
  | 'idle'
  | 'ingesting'
  | 'breaking'
  | 'reproducing'
  | 'fixing'
  | 'proving'
  | 'complete'

export type TimelineStepId =
  | 'ingest'
  | 'red_scan'
  | 'finding'
  | 'test_gen'
  | 'referee_bug'
  | 'blue_patch'
  | 'verify'
  | 'metrics'

export type TimelineStepStatus = 'pending' | 'active' | 'done' | 'failed'

export interface TargetRepo {
  id: string
  name: string
  path: string
  category: BugCategory
  description: string
  files: number
  language: string
}

export interface Finding {
  id: string
  category: BugCategory
  file: string
  function_or_query: string | null
  location: string | null
  description: string
  triggering_input: string
  expected_behavior: string
  observed_behavior: string
  reproduction_steps: string[]
  generated_test: string
  severity: Severity
  confidence: number
}

export interface RefereeResult {
  finding_id: string
  reproduced: boolean
  evidence: string
  execution_output: string
  expected_behavior: string
  observed_behavior: string
  verdict: 'verified_bug' | 'not_reproduced' | 'invalid_test' | 'inconclusive'
  confidence: number
}

export interface PatchAttempt {
  finding_id: string
  files_modified: string[]
  patch: string
  explanation: string
  tests_added_or_modified: string[]
}

export interface PatchResult {
  finding_id: string
  attack_test_passed: boolean
  regression_tests_passed: boolean
  static_checks_passed: boolean
  new_failures: string[]
  patch_accepted: boolean
  rejection_reason: string | null
}

export interface ForgeMetrics {
  bug_proposal_count: number
  reproduction_rate: number
  false_positive_rate: number
  patch_acceptance_rate: number
  regression_pass_rate: number
  avg_time_seconds: number
  cost_per_verified_patch: number
}

export interface TimelineStep {
  id: TimelineStepId
  label: string
  phase: 'break' | 'fix' | 'prove' | 'system'
  detail: string
  delayMs: number
  status: TimelineStepStatus
}

export interface RevealState {
  finding: boolean
  test: boolean
  terminal: boolean
  diff: boolean
  verification: boolean
  metrics: boolean
}

export interface ForgeRunState {
  phase: RunPhase
  selectedRepoId: string
  isRunning: boolean
  timeline: TimelineStep[]
  reveal: RevealState
  finding: Finding | null
  referee: RefereeResult | null
  patch: PatchAttempt | null
  patchResult: PatchResult | null
  metrics: ForgeMetrics | null
  terminalLines: string[]
  startedAt: number | null
  completedAt: number | null
}
