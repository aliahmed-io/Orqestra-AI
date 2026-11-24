/**
 * Typed API client for Orqestra AI FastAPI backend.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Dataset {
  id: number;
  name: string;
  description: string | null;
  process_type: string;
  status: string;
  error_message: string | null;
  row_count: number;
  case_count: number;
  has_deadlines: boolean;
  created_at: string;
}

export interface OverviewMetrics {
  dataset_id: number;
  total_cases: number;
  completed_cases: number;
  open_cases: number;
  rejected_cases: number;
  cancelled_cases: number;
  median_cycle_time_hours: number;
  p90_cycle_time_hours: number;
  delayed_cases: number;
  delayed_rate: number;
  rework_cases: number;
  rework_frequency: number;
  main_bottleneck_stage: string | null;
  main_bottleneck_median_hours: number | null;
  completion_trend: Array<{
    period: string;
    started: number;
    completed: number;
    delayed: number;
  }>;
  activity_frequencies: Array<{
    activity: string;
    case_count: number;
    event_count: number;
    case_percentage: number;
  }>;
  measurement_note: string;
}

export interface ProcessNodeData {
  id: string;
  activity: string;
  case_count: number;
  event_count: number;
  frequency_pct: number;
  median_wait_to_next_hours: number;
  p90_wait_to_next_hours: number;
  is_bottleneck: boolean;
  bottleneck_score: number;
  rework_count: number;
  x: number;
  y: number;
  layer: number;
}

export interface ProcessEdgeData {
  id: string;
  source: string;
  target: string;
  transition_count: number;
  case_count: number;
  case_percentage: number;
  median_elapsed_hours: number;
  p90_elapsed_hours: number;
  is_rework: boolean;
  is_bottleneck: boolean;
}

export interface ProcessGraph {
  dataset_id: number;
  total_cases_in_filter: number;
  nodes: ProcessNodeData[];
  edges: ProcessEdgeData[];
  common_path: string[];
  filters_applied: {
    department: string;
    process_type: string;
    min_case_pct: number;
  };
}

export interface CaseSummary {
  id: number;
  case_key: string;
  process_type: string;
  department: string | null;
  priority: string | null;
  status: string;
  is_delayed: boolean;
  delay_reason: string | null;
  start_time: string | null;
  end_time: string | null;
  deadline: string | null;
  cycle_time_hours: number | null;
  rework_count: number;
  event_count: number;
  variant_id: string | null;
  variant_signature: string | null;
  total_cost: number | null;
}

export interface CaseEvent {
  id: number;
  activity: string;
  timestamp: string;
  sequence_index: number;
  department: string | null;
  responsible_team: string | null;
  outcome: string | null;
  priority: string | null;
  cost: number | null;
  assigned_role: string | null;
  deadline: string | null;
  wait_from_prev_hours: number | null;
}

export interface CaseDetail extends CaseSummary {
  events: CaseEvent[];
  common_variant_signature: string | null;
  matches_common_variant: boolean;
  deviations: string[];
}

export interface PaginatedCases {
  items: CaseSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BottleneckStage {
  activity: string;
  median_wait_hours: number;
  p90_wait_hours: number;
  mean_wait_hours: number;
  affected_cases: number;
  rework_frequency: number;
  rework_count: number;
  bottleneck_score: number;
  department_breakdown: Array<{
    department: string;
    median_wait_hours: number;
    p90_wait_hours: number;
    case_count: number;
  }>;
  measurement_type: string;
}

export interface ProcessVariant {
  variant_id: string;
  activities: string[];
  signature: string;
  case_count: number;
  case_percentage: number;
  median_cycle_time_hours: number;
  p90_cycle_time_hours: number;
  completed_count: number;
  open_count: number;
  rejected_count: number;
  cancelled_count: number;
  avg_rework_count: number;
  delayed_rate: number;
}

export interface ModelEvaluation {
  id: number;
  model_name: string;
  algorithm: string;
  is_active: boolean;
  precision: number;
  recall: number;
  f1_score: number;
  pr_auc: number;
  roc_auc: number;
  brier_score: number;
  calibration_bins: Array<{ predicted: number; observed: number }>;
  feature_importance: Array<{ feature: string; importance: number }>;
  training_samples: number;
  test_samples: number;
  split_strategy: string;
  limitations: string | null;
}

export interface CasePrediction {
  case_id: number;
  case_key: string;
  department: string | null;
  current_stage: string;
  elapsed_hours: number;
  completed_stages: number;
  rework_count: number;
  predicted_probability: number;
  risk_tier: "low" | "medium" | "high";
  prediction_method: string;
  confidence: number;
  top_factors: string[];
}

export interface PredictionsDashboard {
  dataset_id: number;
  models: ModelEvaluation[];
  predictions: CasePrediction[];
  delay_definition: string;
  leakage_guard: string;
}

export interface Recommendation {
  id: string;
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  observation: string;
  suggested_action: string;
  evidence: Record<string, string | number>;
  caveat: string;
}

export interface ReportRecord {
  id: number;
  dataset_id: number;
  title: string;
  report_format: string;
  file_size_bytes: number;
  created_at: string;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listDatasets: () => fetchJson<Dataset[]>("/api/datasets"),
  loadSampleDataset: () =>
    fetchJson<Dataset>("/api/datasets/load-sample", { method: "POST" }),
  importDataset: async (formData: FormData): Promise<Dataset> => {
    const res = await fetch(`${API_BASE_URL}/api/datasets/import`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Import failed" }));
      throw new Error(String(err.detail ?? "Import failed"));
    }
    return res.json() as Promise<Dataset>;
  },
  getOverview: (datasetId: number) =>
    fetchJson<OverviewMetrics>(`/api/datasets/${datasetId}/overview`),
  getFilters: (datasetId: number) =>
    fetchJson<{ departments: string[]; process_types: string[] }>(
      `/api/datasets/${datasetId}/filters`
    ),
  getGraph: (
    datasetId: number,
    params?: { department?: string; process_type?: string; min_case_pct?: number }
  ) => {
    const qs = new URLSearchParams();
    if (params?.department && params.department !== "All") {
      qs.set("department", params.department);
    }
    if (params?.process_type && params.process_type !== "All") {
      qs.set("process_type", params.process_type);
    }
    if (params?.min_case_pct !== undefined && params.min_case_pct > 0) {
      qs.set("min_case_pct", String(params.min_case_pct));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return fetchJson<ProcessGraph>(`/api/datasets/${datasetId}/graph${suffix}`);
  },
  listCases: (
    datasetId: number,
    params: {
      page?: number;
      page_size?: number;
      search?: string;
      status?: string;
      department?: string;
      process_type?: string;
      delayed_only?: boolean;
    }
  ) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.search) qs.set("search", params.search);
    if (params.status && params.status !== "All") qs.set("status", params.status);
    if (params.department && params.department !== "All")
      qs.set("department", params.department);
    if (params.process_type && params.process_type !== "All")
      qs.set("process_type", params.process_type);
    if (params.delayed_only) qs.set("delayed_only", "true");
    return fetchJson<PaginatedCases>(
      `/api/datasets/${datasetId}/cases?${qs.toString()}`
    );
  },
  getCaseDetail: (datasetId: number, caseId: number) =>
    fetchJson<CaseDetail>(`/api/datasets/${datasetId}/cases/${caseId}`),
  getBottlenecks: (datasetId: number) =>
    fetchJson<BottleneckStage[]>(`/api/datasets/${datasetId}/bottlenecks`),
  getVariants: (datasetId: number) =>
    fetchJson<ProcessVariant[]>(`/api/datasets/${datasetId}/variants`),
  getPredictions: (datasetId: number) =>
    fetchJson<PredictionsDashboard>(`/api/datasets/${datasetId}/predictions`),
  retrainPredictions: (datasetId: number) =>
    fetchJson<PredictionsDashboard>(
      `/api/datasets/${datasetId}/predictions/train`,
      { method: "POST" }
    ),
  getRecommendations: (datasetId: number) =>
    fetchJson<Recommendation[]>(`/api/datasets/${datasetId}/recommendations`),
  listReports: (datasetId: number) =>
    fetchJson<ReportRecord[]>(`/api/datasets/${datasetId}/reports`),
  getReportDownloadUrl: (datasetId: number, format: "pdf" | "csv") =>
    `${API_BASE_URL}/api/datasets/${datasetId}/reports/${format}`,
};
