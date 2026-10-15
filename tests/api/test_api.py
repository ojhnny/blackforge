import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from blackforge.api.app import create_app
from blackforge.core.config import Settings

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def client(tmp_path: Path):
    settings = Settings(
        project_root=ROOT,
        data_dir=tmp_path / "data",
        prefer_docker=False,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def wait_for(client: TestClient, run_id: str, timeout: float = 60.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        body = client.get(f"/api/runs/{run_id}").json()
        if body["run"]["status"] in {"completed", "failed", "cancelled"}:
            return body
        time.sleep(0.1)
    raise AssertionError(f"run {run_id} did not finish")


def test_health(client: TestClient):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"


def test_repos_lists_examples_with_manifests(client: TestClient):
    repos = client.get("/api/repos").json()
    ids = [repo["id"] for repo in repos]
    assert "buggy_python" in ids
    repo = repos[ids.index("buggy_python")]
    assert repo["path"] == "examples/buggy_python"
    assert repo["seeded_findings"] == 2


def test_unknown_repo_is_404(client: TestClient):
    assert client.post("/api/runs", json={"repo_id": "nope"}).status_code == 404
    assert client.post("/api/runs", json={"repo_id": "../.."}).status_code == 404


def test_full_run_reproduces_patches_and_verifies(client: TestClient):
    created = client.post("/api/runs", json={"repo_id": "buggy_python"})
    assert created.status_code == 202
    run_id = created.json()["id"]

    body = wait_for(client, run_id)
    assert body["run"]["status"] == "completed", body["run"]["error"]
    assert [s["status"] for s in body["run"]["stages"]] == ["done"] * 5

    by_fn = {f["finding"]["function_or_query"]: f for f in body["findings"]}
    real = by_fn["rolling_mean"]
    assert real["referee"]["verdict"] == "verified_bug"
    assert "TypeError" in real["referee"]["execution_output"]
    assert real["patch_result"]["patch_accepted"] is True
    assert real["patch_result"]["attack_test_passed"] is True
    assert real["patch_result"]["regression_passed"] == real["patch_result"]["regression_total"] > 0

    false_positive = by_fn["rolling_sum"]
    assert false_positive["referee"]["verdict"] == "not_reproduced"
    assert false_positive["patch"] is None

    summary = body["summary"]
    assert summary["findings"] == 2
    assert summary["verified"] == 1
    assert summary["rejected"] == 1
    assert summary["patches_accepted"] == 1

    # The original example is never modified by a run.
    original = (ROOT / "examples/buggy_python/src/analytics/rolling.py").read_text()
    assert "total = sum(window_vals)" in original
    assert not (ROOT / "examples/buggy_python/tests/generated").exists()


def test_events_stream_replays_the_run(client: TestClient):
    run_id = client.post("/api/runs", json={"repo_id": "buggy_python"}).json()["id"]
    with client.stream("GET", f"/api/runs/{run_id}/events") as response:
        assert response.headers["content-type"].startswith("text/event-stream")
        text = "".join(response.iter_text())
    events = [line.split(": ", 1)[1] for line in text.splitlines() if line.startswith("event: ")]
    assert events[0] == "run_started"
    assert events[-1] == "run_completed"
    assert events.count("stage_completed") == 5

    # Reconnecting after the end replays only what came after Last-Event-ID.
    last_id = [line for line in text.splitlines() if line.startswith("id: ")][-2].split(": ")[1]
    with client.stream(
        "GET", f"/api/runs/{run_id}/events", headers={"Last-Event-ID": last_id}
    ) as response:
        tail = "".join(response.iter_text())
    assert [l for l in tail.splitlines() if l.startswith("event: ")] == ["event: run_completed"]


def test_discover_only_skips_execution(client: TestClient):
    run_id = client.post(
        "/api/runs", json={"repo_id": "buggy_python", "mode": "discover_only"}
    ).json()["id"]
    body = wait_for(client, run_id)
    statuses = {s["id"]: s["status"] for s in body["run"]["stages"]}
    assert statuses == {
        "analyze": "done",
        "discover": "done",
        "reproduce": "skipped",
        "patch": "skipped",
        "verify": "skipped",
    }
    assert all(f["referee"] is None for f in body["findings"])


def test_finding_detail_reverify_and_metrics(client: TestClient):
    run_id = client.post("/api/runs", json={"repo_id": "buggy_python"}).json()["id"]
    body = wait_for(client, run_id)
    finding_id = next(
        f["finding"]["id"] for f in body["findings"] if f["finding"]["function_or_query"] == "rolling_mean"
    )

    detail = client.get(f"/api/findings/{finding_id}").json()
    assert detail["finding"]["run_id"] == run_id

    again = client.post(f"/api/findings/{finding_id}/verify")
    assert again.status_code == 200
    assert again.json()["verdict"] == "verified_bug"
    assert len(client.get(f"/api/findings/{finding_id}").json()["referee_history"]) == 2

    metrics = client.get("/api/metrics").json()
    assert metrics["runs"] == 1
    assert metrics["findings"] == 2
    assert metrics["reproduction_rate"] == 0.5
    assert metrics["patch_success_rate"] == 1.0
    assert metrics["regression_rate"] == 0.0
    assert client.get("/api/metrics", params={"repo": "other"}).json()["runs"] == 0


def test_cancel_finished_run_conflicts(client: TestClient):
    run_id = client.post("/api/runs", json={"repo_id": "buggy_python", "mode": "discover_only"}).json()["id"]
    wait_for(client, run_id)
    assert client.post(f"/api/runs/{run_id}/cancel").status_code == 409
    assert client.get("/api/runs/missing").status_code == 404
