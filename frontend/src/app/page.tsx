"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { api, type OverviewMetrics } from "@/lib/api";
import { formatDurationHours, formatPct } from "@/lib/utils";
import { useDataset } from "@/components/layout/DatasetContext";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiTile,
  LoadingPanel,
} from "@/components/ui/primitives";
import { CompletionTrendChart } from "@/components/charts/CompletionTrendChart";

export default function ExecutiveOverviewPage() {
  const { activeDatasetId, activeDataset, loading: dsLoading } = useDataset();
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getOverview(activeDatasetId)
      .then((res) => {
        if (!cancelled) setOverview(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load overview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId]);

  if (dsLoading || loading) {
    return <LoadingPanel label="Computing process overview metrics..." />;
  }

  if (error) {
    return (
      <Card className="p-6 text-sm text-rose-800">
        Error loading overview: {error}
      </Card>
    );
  }

  if (!overview || !activeDataset) {
    return (
      <Card className="p-6 text-sm text-ink-muted">
        Select or import an event log dataset to view process intelligence.
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="space-y-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Executive Overview
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {activeDataset.name} · {activeDataset.process_type}
          </p>
        </div>
        <Link href="/studio">
          <Button>
            <span>Open Process Studio</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Cases"
          value={overview.total_cases}
          sublabel={`${overview.completed_cases} completed · ${overview.open_cases} open`}
          accent="indigo"
        />
        <KpiTile
          label="Median Cycle Time"
          value={formatDurationHours(overview.median_cycle_time_hours)}
          sublabel={`P90: ${formatDurationHours(overview.p90_cycle_time_hours)}`}
        />
        <KpiTile
          label="Delayed Cases"
          value={`${overview.delayed_cases} (${formatPct(overview.delayed_rate)})`}
          sublabel={`${overview.rejected_cases} rejected · ${overview.cancelled_cases} cancelled`}
          accent="apricot"
        />
        <KpiTile
          label="Rework Frequency"
          value={formatPct(overview.rework_frequency)}
          sublabel={`${overview.rework_cases} cases with repeated stages`}
        />
      </div>

      {/* Main Bottleneck Callout + Trend Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Process Volume & Delay Trend</CardTitle>
            <Badge tone="neutral">Weekly cohorts</Badge>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={overview.completion_trend} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-l-4 border-l-apricot p-6">
            <div className="text-xs font-medium text-ink-muted">
              Primary Bottleneck Stage
            </div>
            <div className="mt-2 font-display text-xl font-bold text-ink">
              {overview.main_bottleneck_stage ?? "None detected"}
            </div>
            <div className="mt-2 font-mono-num text-sm text-ink-muted">
              Median wait to next stage:{" "}
              <span className="font-semibold text-ink">
                {formatDurationHours(overview.main_bottleneck_median_hours)}
              </span>
            </div>
            <div className="mt-4">
              <Link href="/bottlenecks">
                <Button size="sm" variant="secondary">
                  Inspect Bottlenecks
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Activity Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.activity_frequencies.slice(0, 6).map((act) => (
                <div key={act.activity} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{act.activity}</span>
                    <span className="font-mono-num text-ink-muted">
                      {act.case_count} ({formatPct(act.case_percentage)})
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-porcelain-recessed">
                    <div
                      className="h-full rounded-full bg-indigo"
                      style={{ width: `${Math.min(100, act.case_percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-ink-muted">{overview.measurement_note}</p>
    </motion.div>
  );
}
