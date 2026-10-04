"""Regression tests that pass on the buggy example."""

from analytics.rolling import rolling_sum


def test_rolling_sum_basic():
    series = [1.0, 2.0, 3.0, 4.0]
    result = rolling_sum(series, window=2)
    assert result[0] is None
    assert result[1] == 3.0
    assert result[2] == 5.0
    assert result[3] == 7.0
