import type {
  AnalysisMode,
  BugCategory,
  EvalMetrics,
  ExecutionEnvironment,
  Finding,
  PatchAttempt,
  PatchResult,
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
    commit: 'a3f8c21',
    language: 'Python',
    categories: ['python_logic'],
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
  { id: 'full', label: 'Full analysis' },
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
  },
  {
    id: 'discover',
    label: 'Discover',
    detail: 'Propose concrete failure cases with executable tests',
    delayMs: 1400,
    status: 'pending',
    durationMs: null,
  },
  {
    id: 'reproduce',
    label: 'Reproduce',
    detail: 'Run failing cases in isolated execution',
    delayMs: 1600,
    status: 'pending',
    durationMs: null,
  },
  {
    id: 'patch',
    label: 'Patch',
    detail: 'Generate minimal diffs for verified findings',
    delayMs: 1300,
    status: 'pending',
    durationMs: null,
  },
  {
    id: 'verify',
    label: 'Verify',
    detail: 'Rerun failing test, regressions, and static checks',
    delayMs: 1500,
    status: 'pending',
    durationMs: null,
  },
]

export const MOCK_FINDINGS: Finding[] = [
  {
    id: 'find_7c2a91',
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
      'TypeError: unsupported operand type(s) for +: float and NoneType',
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
    severity: 'high',
    confidence: 0.91,
    verification_state: 'pending',
  },
  {
    id: 'find_3b91e2',
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
    severity: 'medium',
    confidence: 0.74,
    verification_state: 'pending',
  },
  {
    id: 'find_91aa04',
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
    severity: 'high',
    confidence: 0.62,
    verification_state: 'pending',
  },
  {
    id: 'find_55d0c8',
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
    severity: 'low',
    confidence: 0.58,
    verification_state: 'pending',
  },
]

export const MOCK_REFEREE: RefereeResult = {
  finding_id: 'find_7c2a91',
  reproduced: true,
  evidence:
    'pytest exit code 1 — TypeError matches observed behavior at rolling.py:48.',
  execution_output: `============================= test session starts ==============================
platform linux -- Python 3.12.4, pytest-8.3.2
collected 1 item

tests/generated/test_rolling_mean_none.py::test_rolling_mean_handles_trailing_none FAILED [100%]

=================================== FAILURES ===================================
E   TypeError: unsupported operand type(s) for +: 'float' and 'NoneType'
=========================== short test summary info ============================
FAILED tests/generated/test_rolling_mean_none.py::test_rolling_mean_handles_trailing_none
============================== 1 failed in 0.08s ===============================`,
  expected_behavior: MOCK_FINDINGS[0].expected_behavior,
  observed_behavior: MOCK_FINDINGS[0].observed_behavior,
  verdict: 'verified_bug',
  confidence: 0.97,
}

export const MOCK_PATCH: PatchAttempt = {
  finding_id: 'find_7c2a91',
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
    'Filter None values before aggregation while preserving strict window length for incomplete windows.',
  tests_added_or_modified: [
    'tests/generated/test_rolling_mean_none.py',
  ],
  additions: 4,
  deletions: 2,
}

export const MOCK_PATCH_RESULT: PatchResult = {
  finding_id: 'find_7c2a91',
  attack_test_passed: true,
  regression_tests_passed: true,
  regression_passed: 32,
  regression_total: 32,
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
  duration_label: '2m 14s',
}

export const MOCK_METRICS: EvalMetrics = {
  detection_precision: 0.5,
  detection_recall: 0.67,
  reproduction_rate: 0.5,
  patch_success_rate: 0.5,
  regression_rate: 0.0,
  mean_repair_attempts: 1.0,
  ranking_enabled: true,
  ranking_model: 'PyTorch classifier',
  ranking_precision: 0.78,
  ranking_recall: 0.71,
  ranking_f1: 0.74,
  ranking_roc_auc: 0.86,
}

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
      'blackforge analyze examples/buggy_python@a3f8c21',
      'indexed 12 files, 6 tests',
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
      'docker run --rm blackforge-exec pytest -q tests/generated/test_rolling_mean_none.py',
      'FAILED before patch — TypeError at rolling.py:48',
      'verified: 2 · not reproduced: 2',
    ],
  },
  {
    afterStage: 'patch',
    lines: [
      'patch attempt find_7c2a91 → src/analytics/rolling.py (+4 −2)',
    ],
  },
  {
    afterStage: 'verify',
    lines: [
      'pytest tests/generated/test_rolling_mean_none.py',
      'PASSED after patch',
      'pytest  · 32 passed',
      'patch accepted · find_7c2a91',
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
