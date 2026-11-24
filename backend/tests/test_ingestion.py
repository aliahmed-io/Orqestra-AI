"""Unit tests for CSV event-log ingestion, validation, and case grouping."""
import pytest
from sqlalchemy.orm import Session

from app.models import ProcessCase, ProcessEvent
from app.services.ingestion import IngestionValidationError, ingest_csv_bytes


SAMPLE_CSV = b"""case_id,activity,timestamp,department,priority,deadline
C-102,Manager Review,2026-01-01T11:30:00Z,Engineering,Medium,2026-01-05T09:00:00Z
C-102,Request Submitted,2026-01-01T09:00:00Z,Engineering,Medium,2026-01-05T09:00:00Z
C-102,Finance Review,2026-01-01T14:00:00Z,Engineering,Medium,2026-01-05T09:00:00Z
C-102,Returned to Manager,2026-01-02T14:00:00Z,Engineering,Medium,2026-01-05T09:00:00Z
C-102,Manager Review,2026-01-03T10:00:00Z,Engineering,Medium,2026-01-05T09:00:00Z
C-102,Completed,2026-01-04T12:00:00Z,Engineering,Medium,2026-01-05T09:00:00Z
C-103,Request Submitted,2026-01-02T08:00:00Z,Operations,High,2026-01-03T08:00:00Z
C-103,Manager Review,2026-01-04T10:00:00Z,Operations,High,2026-01-03T08:00:00Z
"""


def test_ingest_sorts_out_of_order_timestamps_and_detects_rework(db_session: Session) -> None:
    ds = ingest_csv_bytes(db_session, SAMPLE_CSV, "Unit Test Log")
    assert ds.status == "ready"
    assert ds.case_count == 2
    assert ds.row_count == 8
    assert ds.has_deadlines is True

    c102 = db_session.query(ProcessCase).filter(ProcessCase.case_key == "C-102").one()
    assert c102.status == "completed"
    assert c102.rework_count == 1  # Manager Review repeated
    assert c102.is_delayed is False
    assert c102.cycle_time_hours == 75.0

    evs = (
        db_session.query(ProcessEvent)
        .filter(ProcessEvent.case_id == c102.id)
        .order_by(ProcessEvent.sequence_index)
        .all()
    )
    assert [e.activity for e in evs] == [
        "Request Submitted",
        "Manager Review",
        "Finance Review",
        "Returned to Manager",
        "Manager Review",
        "Completed",
    ]
    assert evs[0].wait_from_prev_hours is None
    assert evs[1].wait_from_prev_hours == 2.5

    c103 = db_session.query(ProcessCase).filter(ProcessCase.case_key == "C-103").one()
    assert c103.status == "open"
    assert c103.is_delayed is True


def test_ingest_rejects_missing_required_columns(db_session: Session) -> None:
    bad_csv = b"case_id,department\nC-1,Engineering\n"
    with pytest.raises(IngestionValidationError, match="Missing required column"):
        ingest_csv_bytes(db_session, bad_csv, "Bad Log")


def test_ingest_handles_missing_timestamps_gracefully(db_session: Session) -> None:
    mixed_csv = b"""case_id,activity,timestamp
C-1,Request Submitted,2026-01-01T09:00:00Z
C-1,Manager Review,not-a-timestamp
C-1,Completed,2026-01-01T15:00:00Z
"""
    ds = ingest_csv_bytes(db_session, mixed_csv, "Mixed Timestamps")
    assert ds.status == "ready"
    assert ds.row_count == 2
    assert "Skipped 1 row(s)" in (ds.error_message or "")
