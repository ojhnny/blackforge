import type {
  AnalysisMode,
  BugCategory,
  EvalMetrics,
  ExecutionEnvironment,
  Finding,
  PatchAttempt,
  PatchResult,
  PipelineComparison,
  RefereeResult,
  RunSummary,
  SystemActivity,
  TargetRepo,
  WorkflowStage,
} from '../types'

export const TARGET_REPOS: TargetRepo[] = [
  {
    id: 'buggy_python',
    name: 'buggy_python',
    path: 'examples/buggy_python',
    defaultBranch: 'main',
    commit: '8c91e4a',
    language: 'Python',
    categories: ['python_logic', 'data_sql', 'ml_pipeline'],
  },
  {
    id: 'buggy_sql_pipeline',
    name: 'buggy_sql_pipeline',
    path: 'examples/buggy_sql_pipeline',
    defaultBranch: 'main',
    commit: '9c12e04',
    language: 'SQL / DuckDB',
    categories: ['data_sql'],
  },
  {
    id: 'buggy_ml_pipeline',
    name: 'buggy_ml_pipeline',
    path: 'examples/buggy_ml_pipeline',
    defaultBranch: 'main',
    commit: 'e71b90a',
    language: 'scikit-learn',
    categories: ['ml_pipeline'],
  },
]

export const ANALYSIS_MODES: { id: AnalysisMode; label: string }[] = [
  { id: 'full', label: 'Evidence required' },
  { id: 'discover_only', label: 'Discover only' },
  { id: 'verify_existing', label: 'Verify existing findings' },
]

export const ENVIRONMENTS: { id: ExecutionEnvironment; label: string }[] = [
  { id: 'docker_python_312', label: 'Docker · Python 3.12' },
  { id: 'docker_python_311', label: 'Docker · Python 3.11' },
]

export const CATEGORY_OPTIONS: { id: BugCategory; label: string }[] = [
  { id: 'python_logic', label: 'Python logic' },
  { id: 'data_sql', label: 'Data / SQL' },
  { id: 'ml_pipeline', label: 'ML pipeline' },
]

export const INITIAL_WORKFLOW: WorkflowStage[] = [
  {
    id: 'analyze',
    label: 'Analyze',
    detail: 'Index repository, tests, and project metadata',
    delayMs: 800,
    status: 'pending',
    durationMs: null,
    progressLabel: null,
  },
  {
    id: 'discover',
    label: 'Discover',
    detail: 'Propose concrete failure cases with executable tests',
    delayMs: 1400,
    status: 'pending',
    durationMs: null,
    progressLabel: null,
  },
  {
    id: 'reproduce',
    label: 'Reproduce',
    detail: 'Run failing cases in isolated execution',
    delayMs: 1600,
    status: 'pending',
    durationMs: null,
    progressLabel: null,
  },
  {
    id: 'patch',
    label: 'Patch',
    detail: 'Generate minimal diffs for verified findings',
    delayMs: 1300,
    status: 'pending',
    durationMs: null,
    progressLabel: null,
  },
  {
    id: 'verify',
    label: 'Verify',
    detail: 'Rerun failing test, regressions, and static checks',
    delayMs: 1500,
    status: 'pending',
    durationMs: null,
    progressLabel: null,
  },
]

export const STAGE_PROGRESS: Record<string, string> = {
  analyze: 'Indexed 31 files · discovered 8 candidate functions',
  discover: 'Generated 4 candidate findings with reproduction tests',
  reproduce: 'Running reproduction test 3 of 7',
  patch: 'Generating minimal patch for BF-1042',
  verify: 'Rerunning failing test and regression suite',
}

export const MOCK_FINDINGS: Finding[] = [
  {
    id: 'BF-1042',
    category: 'python_logic',
    file: 'src/analytics/rolling.py',
    function_or_query: 'rolling_mean',
    line: 48,
    summary:
      'rolling_mean fails when a valid window contains None values.',
    triggering_input: '[1.0, 2.0, 3.0, None]\nwindow = 3',
    expected_behavior:
      'Return a valid rolling result while treating None as missing.',
    observed_behavior:
      "TypeError:\nunsupported operand type(s) for +: 'float' and 'NoneType'",
    stack_trace: `Traceback (most recent call last):
  File "tests/generated/test_rolling_mean_none.py", line 8, in test_rolling_mean_handles_trailing_none
    result = rolling_mean(series, window=3)
  File "src/analytics/rolling.py", line 48, in rolling_mean
    total = sum(window_vals)
TypeError: unsupported operand type(s) for +: 'float' and 'NoneType'`,
    reproduction_steps: [
      'Load analytics.rolling.rolling_mean',
      'Call with series=[1.0, 2.0, 3.0, None] and window=3',
      'Observe TypeError during sum() over mixed float/None window',
    ],
    generated_test: `import pytest
from analytics.rolling import rolling_mean


def test_rolling_mean_handles_trailing_none():
    series = [1.0, 2.0, 3.0, None]
    result = rolling_mean(series, window=3)

    assert result is not None
    assert len(result) == len(series)
    assert result[2] == pytest.approx(2.0)
    assert result[3] == pytest.approx(2.5)
`,
    test_name: 'test_rolling_mean_handles_trailing_none',
    test_path: 'tests/generated/test_rolling_mean_none.py',
    severity: 'high',
    confidence: 0.91,
    ranking_score: 0.91,
    verification_state: 'pending_verification',
  },
  {
    id: 'BF-1043',
    category: 'python_logic',
    file: 'src/analytics/cohorts.py',
    function_or_query: 'active_users',
    line: 22,
    summary:
      'active_users double-counts users present in overlapping date windows.',
    triggering_input: 'ranges=[(d1,d3), (d2,d4)], users with activity on d2',
    expected_behavior: 'Count each user once per reporting period.',
    observed_behavior: 'Users active on boundary days appear twice in totals.',
    stack_trace: '',
    reproduction_steps: [
      'Build overlapping ranges',
      'Aggregate active_users',
      'Compare unique user ids vs reported count',
    ],
    generated_test: `def test_active_users_no_double_count():
    assert active_users(ranges, events) == 3
`,
    test_name: 'test_active_users_no_double_count',
    test_path: 'tests/generated/test_active_users.py',
    severity: 'medium',
    confidence: 0.74,
    ranking_score: 0.74,
    verification_state: 'pending_verification',
  },
  {
    id: 'BF-1044',
    category: 'data_sql',
    file: 'sql/revenue_by_cohort.sql',
    function_or_query: 'revenue_by_cohort',
    line: 17,
    summary:
      'LEFT JOIN without grain key inflates revenue for multi-order users.',
    triggering_input: 'users with 2+ orders in cohort window',
    expected_behavior: 'Revenue equals sum of order amounts once per order.',
    observed_behavior: 'Revenue multiplied by number of matching dimension rows.',
    stack_trace: '',
    reproduction_steps: [
      'Seed two orders for one user',
      'Run revenue_by_cohort',
      'Compare to ground-truth sum',
    ],
    generated_test: `-- reproduction query compares grain-safe sum vs joined sum`,
    test_name: 'test_revenue_by_cohort_grain',
    test_path: 'tests/generated/test_revenue_by_cohort.py',
    severity: 'high',
    confidence: 0.62,
    ranking_score: 0.62,
    verification_state: 'pending_verification',
  },
  {
    id: 'BF-1045',
    category: 'python_logic',
    file: 'src/analytics/normalize.py',
    function_or_query: 'pct_change',
    line: 11,
    summary: 'pct_change divides by zero when previous value is 0.0.',
    triggering_input: 'prev=0.0, curr=4.0',
    expected_behavior: 'Return None or a defined sentinel for undefined change.',
    observed_behavior: 'ZeroDivisionError raised during normalization.',
    stack_trace: '',
    reproduction_steps: ['Call pct_change(0.0, 4.0)'],
    generated_test: `def test_pct_change_zero_previous():
    assert pct_change(0.0, 4.0) is None
`,
    test_name: 'test_pct_change_zero_previous',
    test_path: 'tests/generated/test_pct_change.py',
    severity: 'low',
    confidence: 0.58,
    ranking_score: 0.58,
    verification_state: 'pending_verification',
  },
]

export const MOCK_REFEREE: RefereeResult = {
  finding_id: 'BF-1042',
  reproduced: true,
  evidence:
    'pytest exit code 1 — TypeError matches observed behavior at rolling.py:48.',
  execution_output: `pytest tests/generated/test_rolling_mean_none.py

FAILED

TypeError: unsupported operand type(s) for +: 'float' and 'NoneType'
  File "src/analytics/rolling.py", line 48, in rolling_mean`,
  expected_behavior: MOCK_FINDINGS[0].expected_behavior,
  observed_behavior: MOCK_FINDINGS[0].observed_behavior,
  verdict: 'verified_bug',
  confidence: 0.97,
}

export const MOCK_PATCH: PatchAttempt = {
  id: 'patch_02',
  finding_id: 'BF-1042',
  files_modified: ['src/analytics/rolling.py'],
  patch: `--- a/src/analytics/rolling.py
+++ b/src/analytics/rolling.py
@@ -42,10 +42,14 @@ def rolling_mean(series: list[float | None], window: int) -> list[float | None]:
     results: list[float | None] = []
     for i in range(len(series)):
         start = max(0, i - window + 1)
-        window_vals = series[start : i + 1]
-        if len(window_vals) < window:
+        window_vals = [v for v in series[start : i + 1] if v is not None]
+        if len(window_vals) == 0:
             results.append(None)
             continue
-        total = sum(window_vals)
-        results.append(total / len(window_vals))
+        if i - start + 1 < window and len(window_vals) < window:
+            results.append(None)
+            continue
+        results.append(sum(window_vals) / len(window_vals))
     return results`,
  explanation:
    'Filter None values before aggregation while preserving strict window-length behavior.',
  tests_added_or_modified: [
    'tests/generated/test_rolling_mean_none.py',
  ],
  additions: 4,
  deletions: 2,
}

export const MOCK_PATCH_RESULT: PatchResult = {
  finding_id: 'BF-1042',
  patch_id: 'patch_02',
  reproduced: true,
  generated_test: true,
  patch_applied: true,
  attack_test_passed: true,
  regression_tests_passed: true,
  regression_passed: 38,
  regression_total: 38,
  static_checks_passed: true,
  new_failures: [],
  patch_accepted: true,
  rejection_reason: null,
}

export const MOCK_SUMMARY: RunSummary = {
  findings: 4,
  verified: 2,
  rejected: 2,
  patches_attempted: 2,
  patches_accepted: 1,
  regressions_introduced: 0,
  tests_executed: 38,
}

export const MOCK_METRICS: EvalMetrics = {
  detection_precision: 0.86,
  detection_recall: 0.81,
  reproduction_rate: 0.5,
  patch_success_rate: 0.5,
  regression_rate: 0.0,
  mean_repair_attempts: 1.0,
  mean_verification_calls: 2.4,
  average_cost_per_finding: 0.12,
  ranking_enabled: true,
  ranking_model: 'finding-ranker-v1',
  ranking_framework: 'PyTorch',
  ranking_precision: 0.86,
  ranking_recall: 0.81,
  ranking_f1: 0.83,
  ranking_roc_auc: 0.9,
}

export const MOCK_COMPARISONS: PipelineComparison[] = [
  {
    name: 'Single LLM',
    reproduction_rate: 0.22,
    patch_success_rate: 0.18,
    false_positive_rate: 0.41,
  },
  {
    name: 'Red + Blue',
    reproduction_rate: 0.35,
    patch_success_rate: 0.29,
    false_positive_rate: 0.28,
  },
  {
    name: 'Red + Referee + Blue',
    reproduction_rate: 0.48,
    patch_success_rate: 0.41,
    false_positive_rate: 0.14,
  },
  {
    name: 'Full BlackForge pipeline',
    reproduction_rate: 0.5,
    patch_success_rate: 0.5,
    false_positive_rate: 0.08,
  },
]

export const MOCK_ACTIVITY: SystemActivity = {
  discovery_model: 'gpt-x',
  verification_environment: 'Docker / Python 3.12',
  patch_attempts: 2,
  analysis_mode: 'full',
}

export const TERMINAL_SEQUENCE: { afterStage: string; lines: string[] }[] = [
  {
    afterStage: 'analyze',
    lines: [
      'blackforge analyze examples/buggy_python@8c91e4a',
      'indexed 31 files',
    ],
  },
  {
    afterStage: 'discover',
    lines: [
      'discovery: 4 candidate findings',
      'wrote tests/generated/test_rolling_mean_none.py',
    ],
  },
  {
    afterStage: 'reproduce',
    lines: [
      'pytest tests/generated/test_rolling_mean_none.py',
      'FAILED',
      'verified: 2 · not reproduced: 2',
    ],
  },
  {
    afterStage: 'patch',
    lines: [
      'patch_02 → src/analytics/rolling.py (+4 −2)',
    ],
  },
  {
    afterStage: 'verify',
    lines: [
      'pytest tests/generated/test_rolling_mean_none.py',
      'PASSED',
      'pytest',
      '38 passed',
      'patch_02 accepted · BF-1042',
    ],
  },
]

export function categoryLabel(category: BugCategory): string {
  switch (category) {
    case 'python_logic':
      return 'Python logic'
    case 'data_sql':
      return 'Data / SQL'
    case 'ml_pipeline':
      return 'ML pipeline'
    case 'api':
      return 'API'
    case 'config':
      return 'Config'
  }
}
