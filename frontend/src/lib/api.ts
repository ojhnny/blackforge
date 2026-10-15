// Client for the BlackForge FastAPI backend, plus mappers from its records
// to the console's view types. The console falls back to mock data when the
// backend is not reachable.
import type {
  AnalysisMode,
  BugCategory,
  EvalMetrics,
  Finding,
  PatchAttempt,
  PatchResult,
  RefereeResult,
  RunStatus,
  RunSummary,
  Severity,
  StageStatus,
  TargetRepo,
  VerificationState,
  WorkflowStageId,
} from '../types'

const BASE = (import.meta.env.VITE_BLACKFORGE_API as string | undefined) ?? '/api'

// --- API records (mirror src/blackforge/core/schemas.py and api/models.py) --

export interface ApiHealth {
  status: 'ok'
  version: string
  docker_available: boolean
}

export interface ApiRepo {
  id: string
  name: string
  path: string
  default_branch: string
  commit: string
  language: string
  categories: BugCategory[]
  seeded_findings: number
}

export interface ApiStage {
  id: WorkflowStageId
  status: 'pending' | 'active' | 'done' | 'skipped' | 'failed'
  detail: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}

export interface ApiRun {
  id: string
  repo_path: string
  repo_id: string | null
  mode: AnalysisMode
  status: 'created' | 'running' | 'reproducing' | 'completed' | 'failed' | 'cancelled'
  stages: ApiStage[]
  finding_ids: string[]
  error: string | null
  created_at: string
  completed_at: string | null
}

interface ApiFinding {
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
  test_path: string | null
  severity: Severity
  confidence: number
}

interface ApiPatch {
  id: string
  finding_id: string
  files_modified: string[]
  patch: string
  explanation: string
  tests_added_or_modified: string[]
}

interface ApiPatchResult {
  finding_id: string
  patch_id: string
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

export interface ApiFindingDetail {
  finding: ApiFinding
  referee: RefereeResult | null
  patch: ApiPatch | null
  patch_result: ApiPatchResult | null
}

export interface ApiRunDetail {
  run: ApiRun
  findings: ApiFindingDetail[]
  summary: RunSummary
}

export interface ApiMetrics {
  runs: number
  findings: number
  referee_calls: number
  verified: number
  reproduction_rate: number | null
  patches_attempted: number
  patches_accepted: number
  patch_success_rate: number | null
  regression_rate: number | null
  mean_verification_calls: number | null
}

export interface ApiEvent {
  run_id: string
  seq: number
  type:
    | 'run_started'
    | 'stage_started'
    | 'stage_completed'
    | 'stage_skipped'
    | 'log'
    | 'run_completed'
    | 'run_failed'
    | 'run_cancelled'
  stage: WorkflowStageId | null
  message: string
}

// --- requests ---------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

export const api = {
  health: (signal?: AbortSignal) => request<ApiHealth>('/health', { signal }),
  repos: () => request<ApiRepo[]>('/repos'),
  startRun: (body: {
    repo_id: string
    mode: AnalysisMode
    categories: BugCategory[]
    prefer_docker: boolean
  }) =>
    request<ApiRun>('/runs', { method: 'POST', body: JSON.stringify(body) }),
  run: (id: string) => request<ApiRunDetail>(`/runs/${id}`),
  cancelRun: (id: string) => request<ApiRun>(`/runs/${id}/cancel`, { method: 'POST' }),
  metrics: (repo?: string) =>
    request<ApiMetrics>(`/metrics${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  events: (id: string) => new EventSource(`${BASE}/runs/${id}/events`),
}

export const EVENT_TYPES: ApiEvent['type'][] = [
  'run_started',
  'stage_started',
  'stage_completed',
  'stage_skipped',
  'log',
  'run_completed',
  'run_failed',
  'run_cancelled',
]

// --- mappers ------------------------------------------------------------------

export function toTargetRepo(repo: ApiRepo): TargetRepo {
  return {
    id: repo.id,
    name: repo.name,
    path: repo.path,
    defaultBranch: repo.default_branch,
    commit: repo.commit,
    language: repo.language,
    categories: repo.categories,
  }
}

export function toRunStatus(status: ApiRun['status']): RunStatus {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'running'
  }
}

export function toStageStatus(status: ApiStage['status']): StageStatus {
  return status
}

function verificationState(detail: ApiFindingDetail, run: ApiRun): VerificationState {
  if (detail.patch_result) {
    return detail.patch_result.patch_accepted ? 'patch_accepted' : 'patch_rejected'
  }
  if (detail.referee) {
    return detail.referee.verdict === 'verified_bug' ? 'verified' : 'not_reproduced'
  }
  const reproduce = run.stages.find((stage) => stage.id === 'reproduce')
  return reproduce?.status === 'active' ? 'verifying' : 'pending_verification'
}

export function toFinding(detail: ApiFindingDetail, run: ApiRun): Finding {
  const f = detail.finding
  const line = f.location?.match(/(\d+)/)
  const testName = f.generated_test.match(/def (test_\w+)/)
  const reproduced = detail.referee?.verdict === 'verified_bug'
  return {
    id: f.id,
    category: f.category,
    file: f.file,
    function_or_query: f.function_or_query,
    line: line ? Number(line[1]) : null,
    summary: f.description,
    triggering_input: f.triggering_input,
    expected_behavior: f.expected_behavior,
    observed_behavior: f.observed_behavior,
    stack_trace: reproduced ? (detail.referee?.execution_output ?? '') : '',
    reproduction_steps: f.reproduction_steps,
    generated_test: f.generated_test,
    test_name: testName ? testName[1] : '',
    test_path: f.test_path ?? '',
    severity: f.severity,
    confidence: f.confidence,
    ranking_score: null,
    verification_state: verificationState(detail, run),
  }
}

export function toPatch(patch: ApiPatch): PatchAttempt {
  let additions = 0
  let deletions = 0
  for (const line of patch.patch.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions += 1
    else if (line.startsWith('-') && !line.startsWith('---')) deletions += 1
  }
  return { ...patch, additions, deletions }
}

export function toPatchResult(result: ApiPatchResult, finding: ApiFinding): PatchResult {
  return {
    ...result,
    reproduced: true,
    generated_test: Boolean(finding.test_path),
  }
}

export function toMetrics(metrics: ApiMetrics): EvalMetrics {
  const meanRepairs =
    metrics.verified > 0 ? metrics.patches_attempted / metrics.verified : null
  return {
    detection_precision: null,
    detection_recall: null,
    reproduction_rate: metrics.reproduction_rate,
    patch_success_rate: metrics.patch_success_rate,
    regression_rate: metrics.regression_rate,
    mean_repair_attempts: meanRepairs,
    mean_verification_calls: metrics.mean_verification_calls,
    // No LLM calls yet: discovery and patches come from the seeded manifest.
    average_cost_per_finding: 0,
    ranking_enabled: false,
    ranking_model: null,
    ranking_framework: null,
    ranking_precision: null,
    ranking_recall: null,
    ranking_f1: null,
    ranking_roc_auc: null,
  }
}
