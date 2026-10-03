import type {
  Finding,
  ForgeMetrics,
  PatchAttempt,
  PatchResult,
  RefereeResult,
  TargetRepo,
  TimelineStep,
} from '../types'

export const TARGET_REPOS: TargetRepo[] = [
  {
    id: 'buggy_python',
    name: 'buggy_python',
    path: 'examples/buggy_python',
    category: 'python_logic',
    description: 'Boundary and empty-input failures in analytics helpers',
    files: 12,
    language: 'Python',
  },
  {
    id: 'buggy_sql_pipeline',
    name: 'buggy_sql_pipeline',
    path: 'examples/buggy_sql_pipeline',
    category: 'data_sql',
    description: 'Join duplication and null-aggregate cohort bugs',
    files: 9,
    language: 'SQL / DuckDB',
  },
  {
    id: 'buggy_ml_pipeline',
    name: 'buggy_ml_pipeline',
    path: 'examples/buggy_ml_pipeline',
    category: 'ml_pipeline',
    description: 'Train/test leakage and metric miscalculation',
    files: 14,
    language: 'scikit-learn',
  },
]

export const INITIAL_TIMELINE: TimelineStep[] = [
  {
    id: 'ingest',
    label: 'Repo ingestion',
    phase: 'system',
    detail: 'Index source, tests, and project metadata',
    delayMs: 700,
    status: 'pending',
  },
  {
    id: 'red_scan',
    label: 'Red Agent scan',
    phase: 'break',
    detail: 'Probe failure modes against target surface',
    delayMs: 1100,
    status: 'pending',
  },
  {
    id: 'finding',
    label: 'Finding emitted',
    phase: 'break',
    detail: 'Structured Finding with severity and confidence',
    delayMs: 900,
    status: 'pending',
  },
  {
    id: 'test_gen',
    label: 'Failing test generated',
    phase: 'break',
    detail: 'Executable pytest reproduction case',
    delayMs: 1000,
    status: 'pending',
  },
  {
    id: 'referee_bug',
    label: 'Referee reproduction',
    phase: 'break',
    detail: 'Isolated Docker run confirms failure',
    delayMs: 1300,
    status: 'pending',
  },
  {
    id: 'blue_patch',
    label: 'Blue Agent patch',
    phase: 'fix',
    detail: 'Minimal diff against verified finding',
    delayMs: 1200,
    status: 'pending',
  },
  {
    id: 'verify',
    label: 'Verification engine',
    phase: 'prove',
    detail: 'Attack test + regression + static checks',
    delayMs: 1400,
    status: 'pending',
  },
  {
    id: 'metrics',
    label: 'Metrics committed',
    phase: 'prove',
    detail: 'Run outcomes stored for evaluation',
    delayMs: 800,
    status: 'pending',
  },
]

export const MOCK_FINDING: Finding = {
  id: 'find_7c2a91',
  category: 'python_logic',
  file: 'src/analytics/rolling.py',
  function_or_query: 'rolling_mean',
  location: 'line 48',
  description:
    'rolling_mean returns NaN for windows that exactly match the series length when the series contains a trailing None sentinel, instead of computing over available numeric values.',
  triggering_input: 'series=[1.0, 2.0, 3.0, None], window=3',
  expected_behavior:
    'Return mean of last 3 numeric-compatible slots, treating None as missing (result ≈ 2.5 for window ending at index 2, or skip incomplete windows cleanly).',
  observed_behavior:
    'TypeError: unsupported operand type(s) for +: float and NoneType — aggregation aborts mid-window.',
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
    # Window ending at index 2 uses [1.0, 2.0, 3.0]
    assert result[2] == pytest.approx(2.0)
    # Window ending at index 3 should skip None, not crash
    assert result[3] == pytest.approx(2.5)
`,
  severity: 'high',
  confidence: 0.91,
}

export const MOCK_REFEREE: RefereeResult = {
  finding_id: 'find_7c2a91',
  reproduced: true,
  evidence:
    'pytest exit code 1 — TypeError matches observed_behavior; failure localized to rolling.py:48.',
  execution_output: `============================= test session starts ==============================
platform linux -- Python 3.11.9, pytest-8.3.2
collected 1 item

tests/generated/test_rolling_mean_none.py::test_rolling_mean_handles_trailing_none FAILED [100%]

=================================== FAILURES ===================================
_________________ test_rolling_mean_handles_trailing_none _________________

    def test_rolling_mean_handles_trailing_none():
        series = [1.0, 2.0, 3.0, None]
>       result = rolling_mean(series, window=3)

src/analytics/rolling.py:48: in rolling_mean
    total = sum(window_vals)
E   TypeError: unsupported operand type(s) for +: 'float' and 'NoneType'

=========================== short test summary info ============================
FAILED tests/generated/test_rolling_mean_none.py::test_rolling_mean_handles_trailing_none
============================== 1 failed in 0.08s ===============================`,
  expected_behavior: MOCK_FINDING.expected_behavior,
  observed_behavior: MOCK_FINDING.observed_behavior,
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
+            # Keep partial windows as None for strict rolling semantics
+            results.append(None)
+            continue
+        results.append(sum(window_vals) / len(window_vals))
     return results`,
  explanation:
    'Filter None values before aggregation and preserve strict window length semantics for incomplete windows. Prevents TypeError while keeping rolling contract intact.',
  tests_added_or_modified: [
    'tests/generated/test_rolling_mean_none.py',
  ],
}

export const MOCK_PATCH_RESULT: PatchResult = {
  finding_id: 'find_7c2a91',
  attack_test_passed: true,
  regression_tests_passed: true,
  static_checks_passed: true,
  new_failures: [],
  patch_accepted: true,
  rejection_reason: null,
}

export const MOCK_METRICS: ForgeMetrics = {
  bug_proposal_count: 1,
  reproduction_rate: 1.0,
  false_positive_rate: 0.0,
  patch_acceptance_rate: 1.0,
  regression_pass_rate: 1.0,
  avg_time_seconds: 8.4,
  cost_per_verified_patch: 0.12,
}

export const TERMINAL_SEQUENCE: { afterStep: string; lines: string[] }[] = [
  {
    afterStep: 'ingest',
    lines: [
      '$ blackforge ingest examples/buggy_python',
      '[ingest] scanning 12 files…',
      '[ingest] indexed 4 modules, 6 tests, 1 pyproject',
    ],
  },
  {
    afterStep: 'red_scan',
    lines: [
      '[red] probing python_logic surfaces…',
      '[red] candidate: analytics.rolling.rolling_mean',
    ],
  },
  {
    afterStep: 'test_gen',
    lines: [
      '[red] wrote tests/generated/test_rolling_mean_none.py',
      '[red] evidence required — handing off to referee',
    ],
  },
  {
    afterStep: 'referee_bug',
    lines: [
      '[referee] docker run --rm blackforge-exec pytest -q',
      '[referee] FAILURE REPRODUCED — verdict=verified_bug',
    ],
  },
  {
    afterStep: 'blue_patch',
    lines: [
      '[blue] drafting minimal patch for find_7c2a91',
      '[blue] files_modified: src/analytics/rolling.py',
    ],
  },
  {
    afterStep: 'verify',
    lines: [
      '[verify] attack test PASSED',
      '[verify] regression suite PASSED (6/6)',
      '[verify] static checks PASSED',
      '[forge] PATCH ACCEPTED — forge run complete',
    ],
  },
]
