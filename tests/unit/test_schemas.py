from blackforge.core.schemas import (
    BugCategory,
    Finding,
    RefereeResult,
    RefereeVerdict,
    Severity,
)


def test_finding_defaults():
    finding = Finding(
        category=BugCategory.PYTHON_LOGIC,
        file="src/analytics/rolling.py",
        description="None handling bug",
        triggering_input="[1,2,None]",
        expected_behavior="skip None",
        observed_behavior="TypeError",
        generated_test="def test_x(): assert False",
        severity=Severity.HIGH,
    )
    assert finding.id.startswith("BF_")
    assert finding.confidence == 0.5


def test_referee_result_roundtrip():
    result = RefereeResult(
        finding_id="BF_demo",
        reproduced=True,
        evidence="failed as expected",
        execution_output="FAILED",
        expected_behavior="ok",
        observed_behavior="TypeError",
        verdict=RefereeVerdict.VERIFIED_BUG,
        confidence=0.95,
        return_code=1,
    )
    restored = RefereeResult.model_validate_json(result.model_dump_json())
    assert restored.verdict == RefereeVerdict.VERIFIED_BUG
    assert restored.reproduced is True
