"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, type ProcessVariant } from "@/lib/api";
import { formatDurationHours, formatPct } from "@/lib/utils";
import { useDataset } from "@/components/layout/DatasetContext";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingPanel,
} from "@/components/ui/primitives";

export default function VariantsPage() {
  const { activeDatasetId } = useDataset();
  const [variants, setVariants] = useState<ProcessVariant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .getVariants(activeDatasetId)
      .then((res) => {
        if (!cancelled) {
          setVariants(res);
          setSelectedIds(res.slice(0, 2).map((v) => v.variant_id));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId]);

  const toggleSelect = (vid: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(vid)) return prev.filter((id) => id !== vid);
      if (prev.length >= 2) return [prev[1]!, vid];
      return [...prev, vid];
    });
  };

  if (loading) {
    return <LoadingPanel label="Grouping cases by observed execution sequence..." />;
  }

  const compared = variants.filter((v) => selectedIds.includes(v.variant_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Process Variant Explorer
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cases grouped by exact observed activity sequence. Select up to two
          variants below to compare paths side by side.
        </p>
      </div>

      {/* Visual Side-by-Side Comparison */}
      {compared.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Visual Variant Comparison</CardTitle>
            <Badge tone="indigo">
              Comparing {compared.length} variant{compared.length > 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {compared.map((v) => (
              <div
                key={v.variant_id}
                className="rounded-lg border border-hairline bg-porcelain p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-sm font-bold text-indigo">
                    {v.variant_id}
                  </span>
                  <span className="font-mono-num text-xs text-ink-muted">
                    {v.case_count} cases ({formatPct(v.case_percentage)}) · Median{" "}
                    {formatDurationHours(v.median_cycle_time_hours)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {v.activities.map((act, idx) => (
                    <React.Fragment key={`${v.variant_id}-${idx}`}>
                      <span className="rounded border border-hairline bg-white px-2.5 py-1 text-xs font-medium text-ink">
                        {act}
                      </span>
                      {idx < v.activities.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 text-soft-slate" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
                  <span>Delayed: {formatPct(v.delayed_rate)}</span>
                  <span>Avg Rework: {v.avg_rework_count}</span>
                  <span>Completed: {v.completed_count}</span>
                  <span>Rejected: {v.rejected_count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Variants List */}
      <div className="space-y-3">
        {variants.map((v, idx) => {
          const isSelected = selectedIds.includes(v.variant_id);
          return (
            <Card
              key={v.variant_id}
              onClick={() => toggleSelect(v.variant_id)}
              className={`cursor-pointer p-5 transition-colors ${
                isSelected ? "border-indigo ring-1 ring-indigo/30" : "hover:bg-white/80"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <span className="font-mono-num text-sm font-bold text-indigo">
                    {v.variant_id}
                  </span>
                  {idx === 0 && <Badge tone="indigo">Standard Path</Badge>}
                  {v.avg_rework_count > 0 && (
                    <Badge tone="apricot">Rework Variant</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-5 font-mono-num text-xs text-ink">
                  <div>
                    <span className="text-ink-muted">Cases: </span>
                    <strong>
                      {v.case_count} ({formatPct(v.case_percentage)})
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-muted">Median: </span>
                    <strong>{formatDurationHours(v.median_cycle_time_hours)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted">Delayed: </span>
                    <strong>{formatPct(v.delayed_rate)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted">Completed: </span>
                    <strong>{v.completed_count}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {v.activities.map((act, i) => (
                  <React.Fragment key={`${v.variant_id}-row-${i}`}>
                    <span className="rounded bg-porcelain px-2 py-0.5 text-xs text-ink">
                      {act}
                    </span>
                    {i < v.activities.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-soft-slate" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
