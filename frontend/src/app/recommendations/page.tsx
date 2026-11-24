"use client";

import React, { useEffect, useState } from "react";
import { api, type Recommendation } from "@/lib/api";
import { useDataset } from "@/components/layout/DatasetContext";
import { Badge, Card, LoadingPanel } from "@/components/ui/primitives";

export default function RecommendationsPage() {
  const { activeDatasetId } = useDataset();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .getRecommendations(activeDatasetId)
      .then((res) => {
        if (!cancelled) setRecs(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId]);

  if (loading) {
    return <LoadingPanel label="Synthesizing evidence-based recommendations..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Recommendation Engine
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Process improvement observations linked directly to observed waiting
          times, rework loops, and delay risk statistics.
        </p>
      </div>

      <div className="space-y-4">
        {recs.map((rec) => (
          <Card key={rec.id} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-ink">
                {rec.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">
                  {rec.category}
                </span>
                <Badge
                  tone={
                    rec.severity === "high"
                      ? "apricot"
                      : rec.severity === "medium"
                      ? "indigo"
                      : "neutral"
                  }
                >
                  {rec.severity} priority
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md bg-porcelain p-4 text-sm">
                <div className="text-xs font-semibold text-ink-muted">
                  Observed Evidence
                </div>
                <p className="mt-1 text-ink">{rec.observation}</p>
              </div>
              <div className="rounded-md bg-indigo-subtle/40 p-4 text-sm">
                <div className="text-xs font-semibold text-indigo">
                  Suggested Improvement
                </div>
                <p className="mt-1 text-ink">{rec.suggested_action}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(rec.evidence).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded border border-hairline bg-white px-2.5 py-1 font-mono-num text-[11px] text-ink-muted"
                >
                  {k}: <strong className="text-ink">{String(v)}</strong>
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs text-ink-muted">{rec.caveat}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
