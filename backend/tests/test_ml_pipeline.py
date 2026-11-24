"""Unit tests for leakage-free ML delay prediction pipeline."""
from pathlib import Path
from sqlalchemy.orm import Session

from scripts.generate_sample_data import generate_purchase_request_log
from app.services.ingestion import ingest_csv_bytes
from app.services.ml_pipeline import train_and_predict_delays


def test_ml_pipeline_trains_three_models_and_scores_open_cases(db_session: Session, tmp_path: Path) -> None:
    csv_path = tmp_path / "ml_sample.csv"
    generate_purchase_request_log(csv_path, num_cases=120, seed=99)
    ds = ingest_csv_bytes(db_session, csv_path.read_bytes(), "ML Test Log")

    dash = train_and_predict_delays(db_session, ds.id)
    models = dash["models"]
    assert len(models) == 3
    algos = {m["algorithm"] for m in models}
    assert algos == {"logistic_regression", "random_forest", "hist_gradient_boosting"}
    assert sum(1 for m in models if m["is_active"]) == 1

    for m in models:
        assert 0.0 <= m["roc_auc"] <= 1.0
        assert 0.0 <= m["pr_auc"] <= 1.0
        assert 0.0 <= m["brier_score"] <= 1.0
        assert m["training_samples"] > 0
        assert m["test_samples"] > 0

    preds = dash["predictions"]
    assert len(preds) > 0
    for p in preds:
        assert 0.0 <= p["predicted_probability"] <= 1.0
        assert p["risk_tier"] in {"low", "medium", "high"}
        assert p["prediction_method"] == "ml_model"


def test_ml_pipeline_falls_back_gracefully_on_tiny_dataset(db_session: Session) -> None:
    tiny_csv = b"""case_id,activity,timestamp
C-1,Request Submitted,2026-01-01T08:00:00Z
C-1,Completed,2026-01-01T12:00:00Z
C-2,Request Submitted,2026-01-02T08:00:00Z
C-2,Manager Review,2026-01-05T08:00:00Z
"""
    ds = ingest_csv_bytes(db_session, tiny_csv, "Tiny Log")
    dash = train_and_predict_delays(db_session, ds.id)
    assert len(dash["models"]) == 0
    assert len(dash["predictions"]) == 1
    assert dash["predictions"][0]["prediction_method"] == "rule_fallback"
