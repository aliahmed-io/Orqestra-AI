"""Pydantic v2 schemas for Orqestra AI API."""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class DatasetOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    process_type: str
    status: str
    error_message: Optional[str] = None
    row_count: int
    case_count: int
    has_deadlines: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OverviewMetrics(BaseModel):
    dataset_id: int
    total_cases: int
    completed_cases: int
    open_cases: int
    rejected_cases: int
    cancelled_cases: int
    median_cycle_time_hours: float
    p90_cycle_time_hours: float
    delayed_cases: int
    delayed_rate: float
    rework_cases: int
    rework_frequency: float
    main_bottleneck_stage: Optional[str] = None
    main_bottleneck_median_hours: Optional[float] = None
    completion_trend: list[dict[str, Any]]
    activity_frequencies: list[dict[str, Any]]
    measurement_note: str


class ProcessNode(BaseModel):
    id: str
    activity: str
    case_count: int
    event_count: int
    frequency_pct: float
    median_wait_to_next_hours: float
    p90_wait_to_next_hours: float
    is_bottleneck: bool
    bottleneck_score: float
    rework_count: int
    x: float
    y: float
    layer: int


class ProcessEdge(BaseModel):
    id: str
    source: str
    target: str
    transition_count: int
    case_count: int
    case_percentage: float
    median_elapsed_hours: float
    p90_elapsed_hours: float
    is_rework: bool
    is_bottleneck: bool


class ProcessGraphOut(BaseModel):
    dataset_id: int
    total_cases_in_filter: int
    nodes: list[ProcessNode]
    edges: list[ProcessEdge]
    common_path: list[str]
    filters_applied: dict[str, Any]


class EventOut(BaseModel):
    id: int
    activity: str
    timestamp: datetime
    sequence_index: int
    department: Optional[str] = None
    responsible_team: Optional[str] = None
    outcome: Optional[str] = None
    priority: Optional[str] = None
    cost: Optional[float] = None
    assigned_role: Optional[str] = None
    deadline: Optional[datetime] = None
    wait_from_prev_hours: Optional[float] = None

    model_config = {"from_attributes": True}


class CaseSummaryOut(BaseModel):
    id: int
    case_key: str
    process_type: str
    department: Optional[str] = None
    priority: Optional[str] = None
    status: str
    is_delayed: bool
    delay_reason: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    deadline: Optional[datetime] = None
    cycle_time_hours: Optional[float] = None
    rework_count: int
    event_count: int
    variant_id: Optional[str] = None
    variant_signature: Optional[str] = None
    total_cost: Optional[float] = None

    model_config = {"from_attributes": True}


class CaseDetailOut(CaseSummaryOut):
    events: list[EventOut] = Field(default_factory=list)
    common_variant_signature: Optional[str] = None
    matches_common_variant: bool = False
    deviations: list[str] = Field(default_factory=list)


class PaginatedCasesOut(BaseModel):
    items: list[CaseSummaryOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class BottleneckStageOut(BaseModel):
    activity: str
    median_wait_hours: float
    p90_wait_hours: float
    mean_wait_hours: float
    affected_cases: int
    rework_frequency: float
    rework_count: int
    bottleneck_score: float
    department_breakdown: list[dict[str, Any]]
    measurement_type: str


class VariantOut(BaseModel):
    variant_id: str
    activities: list[str]
    signature: str
    case_count: int
    case_percentage: float
    median_cycle_time_hours: float
    p90_cycle_time_hours: float
    completed_count: int
    open_count: int
    rejected_count: int
    cancelled_count: int
    avg_rework_count: float
    delayed_rate: float


class ModelEvaluationOut(BaseModel):
    id: int
    model_name: str
    algorithm: str
    is_active: bool
    precision: float
    recall: float
    f1_score: float
    pr_auc: float
    roc_auc: float
    brier_score: float
    calibration_bins: list[dict[str, Any]]
    feature_importance: list[dict[str, Any]]
    training_samples: int
    test_samples: int
    split_strategy: str
    limitations: Optional[str] = None


class CasePredictionOut(BaseModel):
    case_id: int
    case_key: str
    department: Optional[str] = None
    current_stage: str
    elapsed_hours: float
    completed_stages: int
    rework_count: int
    predicted_probability: float
    risk_tier: str
    prediction_method: str
    confidence: float
    top_factors: list[str]


class PredictionsDashboardOut(BaseModel):
    dataset_id: int
    models: list[ModelEvaluationOut]
    predictions: list[CasePredictionOut]
    delay_definition: str
    leakage_guard: str


class RecommendationOut(BaseModel):
    id: str
    category: str
    severity: str
    title: str
    observation: str
    suggested_action: str
    evidence: dict[str, Any]
    caveat: str


class ReportRecordOut(BaseModel):
    id: int
    dataset_id: int
    title: str
    report_format: str
    file_size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}
