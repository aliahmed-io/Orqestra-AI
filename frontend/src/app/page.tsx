"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Network } from "lucide-react";
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
  LoadingPanel,
  OutcomeArcGauge,
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

  const otherClosed = overview.rejected_cases + overview.cancelled_cases;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Executive Overview
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {activeDataset.name} · {activeDataset.process_type}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/predictions">
            <Button variant="secondary" size="md">
              <span>View Delay Risk</span>
            </Button>
          </Link>
          <Link href="/studio">
            <Button size="md">
              <Network className="h-4 w-4" />
              <span>Open Process Studio</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Architectural Telemetry Strip */}
      <Card className="grid grid-cols-2 divide-y divide-hairline overflow-hidden sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="text-xs font-medium text-ink-muted">Total Cases</div>
          <div className="mt-1.5 font-mono-num text-2xl font-bold text-ink">
            {overview.total_cases}
          </div>
          <div className="mt-1 text-[11px] text-ink-muted">
            {overview.open_cases} in progress
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-ink-muted">Completed</div>
          <div className="mt-1.5 font-mono-num text-2xl font-bold text-indigo">
            {overview.completed_cases}
          </div>
          <div className="mt-1 text-[11px] text-ink-muted">
            {overview.rejected_cases} rejected · {overview.cancelled_cases} cancelled
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-ink-muted">Median Cycle</div>
          <div className="mt-1.5 font-mono-num text-2xl font-bold text-ink">
            {formatDurationHours(overview.median_cycle_time_hours)}
          </div>
          <div className="mt-1 font-mono-num text-[11px] text-ink-muted">
            P90: {formatDurationHours(overview.p90_cycle_time_hours)}
          </div>
        </div>
        <div className="p-5 bg-apricot-subtle/35">
          <div className="text-xs font-medium text-ink-muted">Delayed Cases</div>
          <div className="mt-1.5 font-mono-num text-2xl font-bold text-ink">
            {formatPct(overview.delayed_rate)}
          </div>
          <div className="mt-1 font-mono-num text-[11px] text-ink-muted">
            {overview.delayed_cases} cases over SLA
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-ink-muted">Rework Rate</div>
          <div className="mt-1.5 font-mono-num text-2xl font-bold text-ink">
            {formatPct(overview.rework_frequency)}
          </div>
          <div className="mt-1 font-mono-num text-[11px] text-ink-muted">
            {overview.rework_cases} cases looped
          </div>
        </div>
      </Card>

      {/* Main Bento Grid: Trend + Outcome Gauge + Bottleneck Spotlight */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Process Volume & Delay Trend</CardTitle>
            <Badge tone="neutral">Weekly cohorts</Badge>
          </CardHeader>
          <CardContent>
            <CompletionTrendChart data={overview.completion_trend} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Outcome Distribution</CardTitle>
              <Badge tone="indigo">Live</Badge>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <OutcomeArcGauge
                completed={overview.completed_cases}
                open={overview.open_cases}
                other={otherClosed}
                total={overview.total_cases}
              />
              <div className="mt-2 text-center text-[10px] text-ink-muted">
                *Closed includes rejected & cancelled cases
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Bento: Primary Bottleneck Spotlight + Activity Coverage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="flex flex-col justify-between border-l-4 border-l-apricot p-6 lg:col-span-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <AlertTriangle className="h-3.5 w-3.5 text-apricot" />
              <span>Primary Bottleneck Stage</span>
            </div>
            <div className="mt-3 font-display text-2xl font-bold text-ink">
              {overview.main_bottleneck_stage ?? "None detected"}
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Longest observed inter-event queue prior to the next workflow
              handoff.
            </p>
            <div className="mt-4 inline-flex items-baseline gap-2 rounded-md bg-apricot-subtle px-3 py-2">
              <span className="text-xs text-ink-muted">Median wait:</span>
              <span className="font-mono-num text-lg font-bold text-ink">
                {formatDurationHours(overview.main_bottleneck_median_hours)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Link href="/bottlenecks">
              <Button size="sm" variant="secondary">
                Inspect Bottlenecks
              </Button>
            </Link>
            <Link href="/recommendations">
              <Button size="sm" variant="ghost">
                View Suggestions
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Activity Coverage Across Cases</CardTitle>
            <span className="text-xs text-ink-muted">
              {overview.activity_frequencies.length} distinct activities
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {overview.activity_frequencies.map((act) => (
              <div key={act.activity} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{act.activity}</span>
                  <span className="font-mono-num text-ink-muted">
                    {act.case_count} cases ({formatPct(act.case_percentage)})
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-porcelain-recessed">
                  <div
                    className="h-full rounded-full bg-indigo transition-all duration-300"
                    style={{ width: `${Math.min(100, act.case_percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-ink-muted">{overview.measurement_note}</p>
    </motion.div>
  );
}
