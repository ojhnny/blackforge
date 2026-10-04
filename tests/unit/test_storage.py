from pathlib import Path

from blackforge.core.schemas import BugCategory, Finding, Severity
from blackforge.core.storage import Storage


def test_storage_roundtrip(tmp_path: Path):
    storage = Storage(db_path=tmp_path / "test.db")
    finding = Finding(
        category=BugCategory.PYTHON_LOGIC,
        file="a.py",
        description="desc",
        triggering_input="x",
        expected_behavior="y",
        observed_behavior="TypeError",
        generated_test="def test_a(): pass",
        severity=Severity.MEDIUM,
    )
    storage.save_finding(finding)
    loaded = storage.get_finding(finding.id)
    assert loaded is not None
    assert loaded.file == "a.py"
