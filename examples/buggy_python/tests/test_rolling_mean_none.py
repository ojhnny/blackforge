"""Failing reproduction case for the rolling_mean None bug."""

import pytest

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
