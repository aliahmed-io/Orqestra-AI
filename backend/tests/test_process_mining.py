"""Unit tests for deterministic process-mining algorithms."""
from pathlib import Path
from sqlalchemy.orm import Session

from scripts.generate_sample_data import generate_purchase_request_log
from app.services.ingestion import ingest_csv_bytes
from app.services.process_mining import (
    build_process_graph,
    compute_bottlenecks,
    compute_overview_metrics,
    compute_variants,
)


def test_process_mining_pipeline_determinism(db_session: Session, tmp_path: Path) -> None:
    csv_path = tmp_path / "sample.csv"
    generate_purchase_request_log(csv_path, num_cases=60, seed=7)
    ds = ingest_csv_bytes(db_session, csv_path.read_bytes(), "Determinism Test")

    overview = compute_overview_metrics(db_session, ds.id, persist=True)
    assert overview["total_cases"] == 60
    assert overview["completed_cases"] + overview["open_cases"] + overview["rejected_cases"] + overview["cancelled_cases"] == 60
    assert overview["main_bottleneck_stage"] is not None

    graph1 = build_process_graph(db_session, ds.id)
    graph2 = build_process_graph(db_session, ds.id)
    assert graph1 == graph2
    assert len(graph1["nodes"]) >= 4
    assert len(graph1["edges"]) >= 3
    assert len(graph1["common_path"]) >= 3

    bottlenecks = compute_bottlenecks(db_session, ds.id)
    assert len(bottlenecks) >= 3
    assert bottlenecks[0]["bottleneck_score"] >= bottlenecks[-1]["bottleneck_score"]

    variants = compute_variants(db_session, ds.id)
    assert len(variants) >= 2
    assert sum(v["case_count"] for v in variants) == 60
