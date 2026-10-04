export type BugCategory =
  | 'python_logic'
  | 'data_sql'
  | 'ml_pipeline'
  | 'api'
  | 'config'

export type Severity = 'low' | 'medium' | 'high'

export type RunStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

export type WorkflowStageId =
  | 'analyze'
  | 'discover'
  | 'reproduce'
  | 'patch'
  | 'verify'

export type StageStatus = 'pending' | 'active' | 'done' | 'failed'

export type VerificationState =
  | 'pending_verification'
  | 'verifying'
  | 'verified'
  | 'not_reproduced'
  | 'patch_accepted'
  | 'patch_rejected'

export type AnalysisMode = 'full' | 'discover_only' | 'verify_existing'

export type ExecutionEnvironment = 'docker_python_312' | 'docker_python_311'

export type AppView = 'run' | 'evaluation'

export interface TargetRepo {
  id: string
  name: string
  path: string
  defaultBranch: string
  commit: string
  language: string
  categories: BugCategory[]
}

export interface Finding {
  id: string
  category: BugCategory
  file: string
  function_or_query: string | null
  line: number | null
  summary: string
  triggering_input: string
  expected_behavior: string
  observed_behavior: string
  stack_trace: string
  reproduction_steps: string[]
  generated_test: string
  test_name: string
  test_path: string
  severity: Severity
  confidence: number
  ranking_score: number | null
  verification_state: VerificationState
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
  id: string
  finding_id: string
  files_modified: string[]
  patch: string
  explanation: string
  tests_added_or_modified: string[]
  additions: number
  deletions: number
}

export interface PatchResult {
  finding_id: string
  patch_id: string
  reproduced: boolean
  generated_test: boolean
  patch_applied: boolean
  attack_test_passed: boolean
  regression_tests_passed: boolean
  regression_passed: number
  regression_total: number
  static_checks_passed: boolean
  new_failures: string[]
  patch_accepted: boolean
  rejection_reason: string | null
}

export interface RunSummary {
  findings: number
  verified: number
  rejected: number
  patches_attempted: number
  patches_accepted: number
  regressions_introduced: number
  tests_executed: number
}

export interface EvalMetrics {
  detection_precision: number
  detection_recall: number
  reproduction_rate: number
  patch_success_rate: number
  regression_rate: number
  mean_repair_attempts: number
  mean_verification_calls: number
  average_cost_per_finding: number
  ranking_enabled: boolean
  ranking_model: string | null
  ranking_framework: string | null
  ranking_precision: number | null
  ranking_recall: number | null
  ranking_f1: number | null
  ranking_roc_auc: number | null
}

export interface PipelineComparison {
  name: string
  reproduction_rate: number
  patch_success_rate: number
  false_positive_rate: number
}

export interface SystemActivity {
  discovery_model: string
  verification_environment: string
  patch_attempts: number
  analysis_mode: AnalysisMode
}

export interface WorkflowStage {
  id: WorkflowStageId
  label: string
  detail: string
  delayMs: number
  status: StageStatus
  durationMs: number | null
  progressLabel: string | null
}

export interface RevealState {
  summary: boolean
  findings: boolean
  evidence: boolean
  patch: boolean
  verification: boolean
  metrics: boolean
}

export interface RunConfig {
  repoId: string
  branch: string
  commit: string
  mode: AnalysisMode
  categories: BugCategory[]
  environment: ExecutionEnvironment
}

export interface RunError {
  message: string
  detail: string
  stage: WorkflowStageId
}

export interface AnalysisState {
  status: RunStatus
  view: AppView
  runId: string | null
  config: RunConfig
  workflow: WorkflowStage[]
  selectedStageId: WorkflowStageId | null
  progressMessage: string | null
  reveal: RevealState
  findings: Finding[]
  selectedFindingId: string | null
  referee: RefereeResult | null
  patch: PatchAttempt | null
  patchResult: PatchResult | null
  summary: RunSummary | null
  metrics: EvalMetrics | null
  comparisons: PipelineComparison[]
  activity: SystemActivity | null
  error: RunError | null
  terminalLines: string[]
  terminalOpen: boolean
  startedAt: number | null
  completedAt: number | null
  now: number
}
