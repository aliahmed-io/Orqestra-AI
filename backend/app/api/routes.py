"""FastAPI routes for Orqestra AI."""
from __future__ import annotations

import math
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset, ProcessCase, ProcessEvent, ReportRecord
from app.schemas import (
    BottleneckStageOut,
    CaseDetailOut,
    CaseSummaryOut,
    DatasetOut,
    OverviewMetrics,
    PaginatedCasesOut,
    PredictionsDashboardOut,
    ProcessGraphOut,
    RecommendationOut,
    ReportRecordOut,
    VariantOut,
)
from app.services.ingestion import IngestionValidationError, ingest_csv_bytes
from app.services.ml_pipeline import get_predictions_dashboard, train_and_predict_delays
from app.services.process_mining import (
    build_process_graph,
    compute_bottlenecks,
    compute_overview_metrics,
    compute_variants,
)
from app.services.recommendations import generate_recommendations
from app.services.reporting import generate_csv_report, generate_pdf_report

router = APIRouter(prefix="/api")


def _get_dataset_or_404(db: Session, dataset_id: int) -> Dataset:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if ds is None:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    return ds


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "Orqestra AI Backend"}


@router.get("/datasets", response_model=list[DatasetOut])
def list_datasets(db: Session = Depends(get_db)) -> list[Dataset]:
    return db.query(Dataset).order_by(Dataset.created_at.desc()).all()


@router.post("/datasets/import", response_model=DatasetOut)
async def import_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    process_type: str = Form("Purchase Request Approval"),
    db: Session = Depends(get_db),
) -> Dataset:
    content = await file.read()
    try:
        ds = ingest_csv_bytes(
            db=db,
            csv_bytes=content,
            dataset_name=name.strip() or (file.filename or "Imported Event Log"),
            description=description,
            process_type_default=process_type,
        )
        compute_overview_metrics(db, ds.id, persist=True)
        train_and_predict_delays(db, ds.id)
        return ds
    except IngestionValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/datasets/load-sample", response_model=DatasetOut)
def load_sample_dataset(db: Session = Depends(get_db)) -> Dataset:
    sample_path = Path(__file__).resolve().parents[3] / "data" / "sample_purchase_requests.csv"
    if not sample_path.exists():
        from scripts.generate_sample_data import generate_purchase_request_log
        generate_purchase_request_log(sample_path)

    ds = ingest_csv_bytes(
        db=db,
        csv_bytes=sample_path.read_bytes(),
        dataset_name="Purchase Request Approvals (Sample)",
        description="Seeded synthetic purchase-request event log with rework loops, rejections, and open cases.",
        process_type_default="Purchase Request Approval",
    )
    compute_overview_metrics(db, ds.id, persist=True)
    train_and_predict_delays(db, ds.id)
    return ds


@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    ds = _get_dataset_or_404(db, dataset_id)
    db.delete(ds)
    db.commit()
    return {"status": "deleted", "dataset_id": str(dataset_id)}


@router.get("/datasets/{dataset_id}/overview", response_model=OverviewMetrics)
def get_overview(dataset_id: int, db: Session = Depends(get_db)) -> dict:
    _get_dataset_or_404(db, dataset_id)
    return compute_overview_metrics(db, dataset_id)


@router.get("/datasets/{dataset_id}/filters")
def get_dataset_filters(dataset_id: int, db: Session = Depends(get_db)) -> dict:
    _get_dataset_or_404(db, dataset_id)
    depts = [
        r[0]
        for r in db.query(ProcessCase.department).filter(ProcessCase.dataset_id == dataset_id, ProcessCase.department.isnot(None)).distinct().all()
    ]
    ptypes = [
        r[0]
        for r in db.query(ProcessCase.process_type).filter(ProcessCase.dataset_id == dataset_id).distinct().all()
    ]
    times = [
        r[0]
        for r in db.query(ProcessCase.start_time).filter(ProcessCase.dataset_id == dataset_id, ProcessCase.start_time.isnot(None)).all()
    ]
    min_date = min(times).strftime("%Y-%m-%d") if times else None
    max_date = max(times).strftime("%Y-%m-%d") if times else None
    return {
        "departments": sorted(depts),
        "process_types": sorted(ptypes),
        "min_date": min_date,
        "max_date": max_date,
    }


@router.get("/datasets/{dataset_id}/graph", response_model=ProcessGraphOut)
def get_process_graph(
    dataset_id: int,
    department: Optional[str] = Query(None),
    process_type: Optional[str] = Query(None),
    min_case_pct: float = Query(0.0, ge=0.0, le=100.0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> dict:
    _get_dataset_or_404(db, dataset_id)
    return build_process_graph(
        db=db,
        dataset_id=dataset_id,
        department=department,
        process_type=process_type,
        min_case_pct=min_case_pct,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/datasets/{dataset_id}/cases", response_model=PaginatedCasesOut)
def list_cases(
    dataset_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    process_type: Optional[str] = Query(None),
    delayed_only: bool = Query(False),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> dict:
    from datetime import datetime, timezone

    _get_dataset_or_404(db, dataset_id)
    q = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id)
    if search:
        q = q.filter(ProcessCase.case_key.ilike(f"%{search.strip()}%"))
    if status and status != "All":
        q = q.filter(ProcessCase.status == status.lower())
    if department and department != "All":
        q = q.filter(ProcessCase.department == department)
    if process_type and process_type != "All":
        q = q.filter(ProcessCase.process_type == process_type)
    if delayed_only:
        q = q.filter(ProcessCase.is_delayed.is_(True))
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            q = q.filter(ProcessCase.start_time >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            q = q.filter(ProcessCase.start_time <= ed)
        except ValueError:
            pass

    total = q.count()
    total_pages = max(1, math.ceil(total / page_size))
    items = (
        q.order_by(ProcessCase.start_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [CaseSummaryOut.model_validate(c) for c in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/datasets/{dataset_id}/cases/{case_id}", response_model=CaseDetailOut)
def get_case_detail(dataset_id: int, case_id: int, db: Session = Depends(get_db)) -> dict:
    _get_dataset_or_404(db, dataset_id)
    case_obj = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id, ProcessCase.id == case_id).first()
    if case_obj is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    events = (
        db.query(ProcessEvent)
        .filter(ProcessEvent.case_id == case_obj.id)
        .order_by(ProcessEvent.sequence_index)
        .all()
    )

    variants = compute_variants(db, dataset_id)
    common_sig = variants[0]["signature"] if variants else None
    matches_common = bool(common_sig and case_obj.variant_signature == common_sig)

    deviations: list[str] = []
    if case_obj.rework_count > 0:
        deviations.append(f"Contains {case_obj.rework_count} repeated activity/rework loop(s)")
    if case_obj.is_delayed:
        deviations.append(case_obj.delay_reason or "Exceeded deadline / SLA threshold")
    if common_sig and not matches_common:
        deviations.append("Path diverges from the most common standard process variant")

    base = CaseSummaryOut.model_validate(case_obj).model_dump()
    base["events"] = events
    base["common_variant_signature"] = common_sig
    base["matches_common_variant"] = matches_common
    base["deviations"] = deviations
    return base


@router.get("/datasets/{dataset_id}/bottlenecks", response_model=list[BottleneckStageOut])
def get_bottlenecks(dataset_id: int, db: Session = Depends(get_db)) -> list[dict]:
    _get_dataset_or_404(db, dataset_id)
    return compute_bottlenecks(db, dataset_id)


@router.get("/datasets/{dataset_id}/variants", response_model=list[VariantOut])
def get_variants(dataset_id: int, db: Session = Depends(get_db)) -> list[dict]:
    _get_dataset_or_404(db, dataset_id)
    return compute_variants(db, dataset_id)


@router.get("/datasets/{dataset_id}/predictions", response_model=PredictionsDashboardOut)
def get_predictions(dataset_id: int, db: Session = Depends(get_db)) -> dict:
    _get_dataset_or_404(db, dataset_id)
    return get_predictions_dashboard(db, dataset_id)


@router.post("/datasets/{dataset_id}/predictions/train", response_model=PredictionsDashboardOut)
def retrain_predictions(dataset_id: int, db: Session = Depends(get_db)) -> dict:
    _get_dataset_or_404(db, dataset_id)
    return train_and_predict_delays(db, dataset_id)


@router.get("/datasets/{dataset_id}/recommendations", response_model=list[RecommendationOut])
def get_recommendations(dataset_id: int, db: Session = Depends(get_db)) -> list[dict]:
    _get_dataset_or_404(db, dataset_id)
    return generate_recommendations(db, dataset_id)


@router.get("/datasets/{dataset_id}/reports", response_model=list[ReportRecordOut])
def list_reports(dataset_id: int, db: Session = Depends(get_db)) -> list[ReportRecord]:
    _get_dataset_or_404(db, dataset_id)
    return db.query(ReportRecord).filter(ReportRecord.dataset_id == dataset_id).order_by(ReportRecord.created_at.desc()).all()


@router.get("/datasets/{dataset_id}/reports/pdf")
def download_pdf_report(dataset_id: int, db: Session = Depends(get_db)) -> Response:
    _get_dataset_or_404(db, dataset_id)
    pdf_bytes, filename, _ = generate_pdf_report(db, dataset_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/datasets/{dataset_id}/reports/csv")
def download_csv_report(dataset_id: int, db: Session = Depends(get_db)) -> Response:
    _get_dataset_or_404(db, dataset_id)
    csv_bytes, filename, _ = generate_csv_report(db, dataset_id)
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
