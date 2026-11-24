"""Integration tests for FastAPI endpoints."""
from fastapi.testclient import TestClient


SAMPLE_UPLOAD = b"""case_id,activity,timestamp,department,priority,deadline
PR-1,Request Submitted,2026-02-01T09:00:00Z,Engineering,Medium,2026-02-06T09:00:00Z
PR-1,Manager Review,2026-02-01T14:00:00Z,Engineering,Medium,2026-02-06T09:00:00Z
PR-1,Finance Review,2026-02-03T10:00:00Z,Engineering,Medium,2026-02-06T09:00:00Z
PR-1,Completed,2026-02-04T12:00:00Z,Engineering,Medium,2026-02-06T09:00:00Z
PR-2,Request Submitted,2026-02-02T09:00:00Z,Marketing,High,2026-02-04T09:00:00Z
PR-2,Manager Review,2026-02-03T16:00:00Z,Marketing,High,2026-02-04T09:00:00Z
"""


def test_full_api_workflow(client: TestClient) -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    res = client.post(
        "/api/datasets/import",
        files={"file": ("test.csv", SAMPLE_UPLOAD, "text/csv")},
        data={"name": "API Integration Dataset", "process_type": "Purchase Request Approval"},
    )
    assert res.status_code == 200
    ds_id = res.json()["id"]

    assert client.get(f"/api/datasets/{ds_id}/overview").status_code == 200
    assert client.get(f"/api/datasets/{ds_id}/graph").status_code == 200
    assert client.get(f"/api/datasets/{ds_id}/bottlenecks").status_code == 200
    assert client.get(f"/api/datasets/{ds_id}/variants").status_code == 200
    assert client.get(f"/api/datasets/{ds_id}/predictions").status_code == 200
    assert client.get(f"/api/datasets/{ds_id}/recommendations").status_code == 200

    cases_res = client.get(f"/api/datasets/{ds_id}/cases?page=1&page_size=10")
    assert cases_res.status_code == 200
    cases_data = cases_res.json()
    assert cases_data["total"] == 2
    first_case_id = cases_data["items"][0]["id"]

    detail_res = client.get(f"/api/datasets/{ds_id}/cases/{first_case_id}")
    assert detail_res.status_code == 200
    assert len(detail_res.json()["events"]) >= 2

    pdf_res = client.get(f"/api/datasets/{ds_id}/reports/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

    csv_res = client.get(f"/api/datasets/{ds_id}/reports/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
