from pathlib import Path

import pytest

from blackforge.agents.referee import Referee
from blackforge.core.config import Settings
from blackforge.core.schemas import BugCategory, Finding, RefereeVerdict, Severity
from blackforge.core.storage import Storage


@pytest.fixture
def example_repo() -> Path:
    root = Path(__file__).resolve().parents[2]
    return root / "examples" / "buggy_python"


def test_referee_reproduces_rolling_mean_bug(example_repo: Path, tmp_path: Path):
    settings = Settings(
        project_root=example_repo.parents[1],
        data_dir=tmp_path / "data",
        sqlite_path=tmp_path / "data" / "test.db",
        prefer_docker=False,
    )
    storage = Storage(settings=settings)
    referee = Referee(settings=settings, storage=storage)

    test_path = "tests/test_rolling_mean_none.py"
    finding = Finding(
        category=BugCategory.PYTHON_LOGIC,
        file="src/analytics/rolling.py",
        function_or_query="rolling_mean",
        location="line 48",
        description="rolling_mean fails when a window contains None",
        triggering_input="[1.0, 2.0, 3.0, None]; window=3",
        expected_behavior="Treat None as missing",
        observed_behavior="TypeError: unsupported operand type(s) for +: float and NoneType",
        generated_test=(example_repo / test_path).read_text(encoding="utf-8"),
        test_path=test_path,
        severity=Severity.HIGH,
        confidence=0.9,
    )

    result = referee.reproduce(example_repo, finding, prefer_docker=False)

    assert result.reproduced is True
    assert result.verdict == RefereeVerdict.VERIFIED_BUG
    assert result.return_code == 1
    assert "TypeError" in result.execution_output
    saved = storage.list_referee_results(finding.id)
    assert len(saved) == 1
    assert saved[0].reproduced is True
