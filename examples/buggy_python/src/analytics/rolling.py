"""Rolling analytics helpers — intentionally buggy for BlackForge demos."""

from __future__ import annotations


def rolling_mean(series: list[float | None], window: int) -> list[float | None]:
    """
    Compute a simple rolling mean.

    BUG: None values inside a window raise TypeError during sum().
    """
    if window <= 0:
        raise ValueError("window must be positive")

    results: list[float | None] = []
    for i in range(len(series)):
        start = max(0, i - window + 1)
        window_vals = series[start : i + 1]
        if len(window_vals) < window:
            results.append(None)
            continue
        # Intentionally naive — blows up when None is present.
        total = sum(window_vals)  # type: ignore[arg-type]
        results.append(total / len(window_vals))
    return results


def rolling_sum(series: list[float], window: int) -> list[float | None]:
    """Regression helper that should keep working."""
    if window <= 0:
        raise ValueError("window must be positive")
    results: list[float | None] = []
    for i in range(len(series)):
        start = max(0, i - window + 1)
        window_vals = series[start : i + 1]
        if len(window_vals) < window:
            results.append(None)
            continue
        results.append(sum(window_vals))
    return results
