"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { api, type PredictionsDashboard } from "@/lib/api";
import { formatDurationHours, formatPct } from "@/lib/utils";
import { useDataset } from "@/components/layout/DatasetContext";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingPanel,
} from "@/components/ui/primitives";
import { CalibrationChart } from "@/components/charts/CalibrationChart";

export default function PredictionsPage() {
  const { activeDatasetId } = useDataset();
  const [data, setData] = useState<PredictionsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .getPredictions(activeDatasetId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId]);

  const handleRetrain = async () => {
    if (activeDatasetId === null) return;
    setTraining(true);
    try {
      const updated = await api.retrainPredictions(activeDatasetId);
      setData(updated);
    } finally {
      setTraining(false);
    }
  };

  if (loading || !data) {
    return <LoadingPanel label="Loading ML delay prediction models..." />;
  }

  const activeModel = data.models.find((m) => m.is_active) ?? data.models[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            AI Delay Prediction
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Prefix-based supervised classifiers predicting deadline risk for
            in-progress cases without future-event leakage.
          </p>
        </div>
        <Button onClick={handleRetrain} disabled={training}>
          <RefreshCw className={`h-4 w-4 ${training ? "animate-spin" : ""}`} />
          <span>{training ? "Training Models..." : "Retrain & Score"}</span>
        </Button>
      </div>

      {/* Leakage Guard & Delay Definition */}
      <Card className="border-l-4 border-l-indigo bg-indigo-subtle/40 p-4 text-xs text-ink">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo" />
          <div className="space-y-1">
            <div>
              <strong>Delay Label:</strong> {data.delay_definition}
            </div>
            <div className="text-ink-muted">
              <strong>Evaluation & Leakage Guard:</strong> {data.leakage_guard}
            </div>
          </div>
        </div>
      </Card>

      {/* 3-Model Comparison Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Classifier Benchmark (Time-Aware Case-Level Test Split)</CardTitle>
        </CardHeader>
        {data.models.length === 0 ? (
          <CardContent className="text-sm text-ink-muted">
            Insufficient closed cases with both classes to train ML classifiers;
            using deterministic rule-based fallback for open case scoring.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline bg-porcelain text-xs font-semibold text-ink-muted">
                <tr>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-4 py-3">Precision</th>
                  <th className="px-4 py-3">Recall</th>
                  <th className="px-4 py-3">F1-Score</th>
                  <th className="px-4 py-3">PR-AUC</th>
                  <th className="px-4 py-3">ROC-AUC</th>
                  <th className="px-4 py-3">Brier</th>
                  <th className="px-4 py-3">Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {data.models.map((m) => (
                  <tr key={m.id} className={m.is_active ? "bg-indigo-subtle/30" : ""}>
                    <td className="px-6 py-3.5 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <span>{m.model_name}</span>
                        {m.is_active && <Badge tone="indigo">Active</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono-num">{m.precision.toFixed(3)}</td>
                    <td className="px-4 py-3.5 font-mono-num">{m.recall.toFixed(3)}</td>
                    <td className="px-4 py-3.5 font-mono-num font-semibold">{m.f1_score.toFixed(3)}</td>
                    <td className="px-4 py-3.5 font-mono-num">{m.pr_auc.toFixed(3)}</td>
                    <td className="px-4 py-3.5 font-mono-num">{m.roc_auc.toFixed(3)}</td>
                    <td className="px-4 py-3.5 font-mono-num">{m.brier_score.toFixed(3)}</td>
                    <td className="px-4 py-3.5 font-mono-num text-xs text-ink-muted">
                      {m.training_samples} / {m.test_samples}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Calibration + Feature Importance */}
      {activeModel && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Probability Calibration ({activeModel.model_name})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeModel.calibration_bins.length > 0 ? (
                <CalibrationChart bins={activeModel.calibration_bins} />
              ) : (
                <p className="text-xs text-ink-muted">
                  Calibration bins unavailable for this test sample size.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Predictive Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeModel.feature_importance.map((fi) => (
                <div key={fi.feature} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono-num text-ink">{fi.feature}</span>
                    <span className="font-mono-num text-ink-muted">
                      {fi.importance.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-porcelain-recessed">
                    <div
                      className="h-full rounded-full bg-indigo"
                      style={{ width: `${Math.min(100, fi.importance * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Open Cases Risk Queue */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>In-Progress Cases Delay Risk Queue ({data.predictions.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline bg-porcelain text-xs font-semibold text-ink-muted">
              <tr>
                <th className="px-6 py-3">Case ID</th>
                <th className="px-4 py-3">Current Stage</th>
                <th className="px-4 py-3">Elapsed</th>
                <th className="px-4 py-3">Delay Prob.</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Contributing Factors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.predictions.map((p) => (
                <tr key={p.case_id} className="hover:bg-porcelain/60">
                  <td className="px-6 py-3.5 font-mono-num font-semibold text-indigo">
                    {p.case_key}
                  </td>
                  <td className="px-4 py-3.5 text-ink">{p.current_stage}</td>
                  <td className="px-4 py-3.5 font-mono-num">
                    {formatDurationHours(p.elapsed_hours)}
                  </td>
                  <td className="px-4 py-3.5 font-mono-num font-semibold text-ink">
                    {formatPct(p.predicted_probability * 100)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge
                      tone={
                        p.risk_tier === "high"
                          ? "apricot"
                          : p.risk_tier === "medium"
                          ? "indigo"
                          : "success"
                      }
                    >
                      {p.risk_tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-ink-muted">
                    {p.top_factors.join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
