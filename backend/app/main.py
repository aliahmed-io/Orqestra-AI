"""FastAPI application entrypoint for Orqestra AI."""
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Dataset
from app.services.ingestion import ingest_csv_bytes
from app.services.ml_pipeline import train_and_predict_delays
from app.services.process_mining import compute_overview_metrics


def _seed_initial_sample_if_empty() -> None:
    """Populate the database with the seeded purchase-request dataset on first boot."""
    db = SessionLocal()
    try:
        if db.query(Dataset).count() == 0:
            sample_path = Path(__file__).resolve().parents[2] / "data" / "sample_purchase_requests.csv"
            if not sample_path.exists():
                from scripts.generate_sample_data import generate_purchase_request_log
                generate_purchase_request_log(sample_path)
            ds = ingest_csv_bytes(
                db=db,
                csv_bytes=sample_path.read_bytes(),
                dataset_name="Purchase Request Approvals (Sample)",
                description="Seeded synthetic purchase-request event log demonstrating normal paths, rework loops, bottlenecks, and open cases.",
                process_type_default="Purchase Request Approval",
            )
            compute_overview_metrics(db, ds.id, persist=True)
            train_and_predict_delays(db, ds.id)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    _seed_initial_sample_if_empty()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Enterprise Process Intelligence Platform",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
