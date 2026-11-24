"""SQLAlchemy ORM models for Orqestra AI."""
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Dataset(Base):
    """Represents an imported event-log dataset."""

    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    process_type = Column(String(120), nullable=False, default="Purchase Request Approval")
    status = Column(String(32), nullable=False, default="pending")  # pending, processing, ready, failed
    error_message = Column(Text, nullable=True)
    row_count = Column(Integer, nullable=False, default=0)
    case_count = Column(Integer, nullable=False, default=0)
    has_deadlines = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    process_definitions = relationship("ProcessDefinition", back_populates="dataset", cascade="all, delete-orphan")
    cases = relationship("ProcessCase", back_populates="dataset", cascade="all, delete-orphan")
    events = relationship("ProcessEvent", back_populates="dataset", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="dataset", cascade="all, delete-orphan")
    models = relationship("ModelMetadata", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("ReportRecord", back_populates="dataset", cascade="all, delete-orphan")


class ProcessDefinition(Base):
    """Stores process-level metadata and SLA configuration for a dataset."""

    __tablename__ = "process_definitions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(160), nullable=False)
    expected_activities_json = Column(JSON, nullable=True)
    sla_hours = Column(Float, nullable=False, default=120.0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="process_definitions")


class ProcessCase(Base):
    """Represents an individual process instance reconstructed from events."""

    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    case_key = Column(String(120), nullable=False, index=True)
    process_type = Column(String(120), nullable=False, default="Purchase Request Approval")
    department = Column(String(120), nullable=True, index=True)
    priority = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="open", index=True)  # completed, open, rejected, cancelled
    is_delayed = Column(Boolean, nullable=False, default=False, index=True)
    delay_reason = Column(String(255), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    cycle_time_hours = Column(Float, nullable=True)
    rework_count = Column(Integer, nullable=False, default=0)
    event_count = Column(Integer, nullable=False, default=0)
    variant_id = Column(String(64), nullable=True, index=True)
    variant_signature = Column(Text, nullable=True)
    total_cost = Column(Float, nullable=True)

    dataset = relationship("Dataset", back_populates="cases")
    events = relationship("ProcessEvent", back_populates="case", cascade="all, delete-orphan", order_by="ProcessEvent.sequence_index")
    predictions = relationship("DelayPrediction", back_populates="case", cascade="all, delete-orphan")


class ProcessEvent(Base):
    """Represents a single timestamped event within a process case."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    activity = Column(String(160), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    sequence_index = Column(Integer, nullable=False)
    department = Column(String(120), nullable=True)
    responsible_team = Column(String(120), nullable=True)
    outcome = Column(String(120), nullable=True)
    priority = Column(String(64), nullable=True)
    cost = Column(Float, nullable=True)
    assigned_role = Column(String(120), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    wait_from_prev_hours = Column(Float, nullable=True)

    dataset = relationship("Dataset", back_populates="events")
    case = relationship("ProcessCase", back_populates="events")


class AnalysisRun(Base):
    """Records a deterministic process mining or ML analysis execution."""

    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    run_type = Column(String(64), nullable=False)  # process_mining, ml_training
    status = Column(String(32), nullable=False, default="completed")
    summary_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="analysis_runs")
    metrics = relationship("ProcessMetric", back_populates="analysis_run", cascade="all, delete-orphan")


class ProcessMetric(Base):
    """Stores computed KPIs and stage metrics for an analysis run."""

    __tablename__ = "process_metrics"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_key = Column(String(120), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    unit = Column(String(32), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    analysis_run = relationship("AnalysisRun", back_populates="metrics")


class ModelMetadata(Base):
    """Stores trained ML model evaluation metrics and provenance."""

    __tablename__ = "model_metadata"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(120), nullable=False)
    algorithm = Column(String(64), nullable=False)  # logistic_regression, random_forest, hist_gradient_boosting
    is_active = Column(Boolean, nullable=False, default=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    pr_auc = Column(Float, nullable=False)
    roc_auc = Column(Float, nullable=False)
    brier_score = Column(Float, nullable=False)
    calibration_json = Column(JSON, nullable=True)
    feature_importance_json = Column(JSON, nullable=True)
    training_samples = Column(Integer, nullable=False, default=0)
    test_samples = Column(Integer, nullable=False, default=0)
    split_strategy = Column(String(120), nullable=False)
    limitations = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="models")
    predictions = relationship("DelayPrediction", back_populates="model")


class DelayPrediction(Base):
    """Stores delay risk predictions for open/in-progress cases."""

    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id = Column(Integer, ForeignKey("model_metadata.id", ondelete="SET NULL"), nullable=True)
    predicted_probability = Column(Float, nullable=False)
    risk_tier = Column(String(32), nullable=False)  # low, medium, high
    prediction_method = Column(String(32), nullable=False, default="ml_model")  # ml_model, rule_fallback
    top_factors_json = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("ProcessCase", back_populates="predictions")
    model = relationship("ModelMetadata", back_populates="predictions")


class ReportRecord(Base):
    """Tracks generated PDF and CSV management reports."""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    report_format = Column(String(16), nullable=False)  # pdf, csv
    file_size_bytes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="reports")
