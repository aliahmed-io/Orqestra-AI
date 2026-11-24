"use client";

import React, { useEffect, useState } from "react";
import { api, type BottleneckStage } from "@/lib/api";
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
import { BottleneckChart } from "@/components/charts/BottleneckChart";

export default function BottlenecksPage() {
  const { activeDatasetId } = useDataset();
  const [stages, setStages] = useState<BottleneckStage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .getBottlenecks(activeDatasetId)
      .then((res) => {
        if (!cancelled) setStages(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId]);

  if (loading) {
    return <LoadingPanel label="Analyzing stage waiting distributions..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Bottleneck Intelligence
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Identifies stages with prolonged inter-event waiting times, upper-percentile
          tails (P90), rework concentration, and departmental disparities.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Median vs. P90 Stage Waiting Time (Hours)</CardTitle>
          <Badge tone="apricot">Observed Inter-Event Wait</Badge>
        </CardHeader>
        <CardContent>
          <BottleneckChart stages={stages} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Stage Bottleneck Ranking</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline bg-porcelain text-xs font-semibold text-ink-muted">
              <tr>
                <th className="px-6 py-3">Stage</th>
                <th className="px-4 py-3">Median Wait</th>
                <th className="px-4 py-3">P90 Wait</th>
                <th className="px-4 py-3">Affected Cases</th>
                <th className="px-4 py-3">Rework Rate</th>
                <th className="px-4 py-3">Department Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {stages.map((st, idx) => (
                <tr key={st.activity} className="hover:bg-porcelain/60">
                  <td className="px-6 py-4 font-medium text-ink">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Badge tone="apricot">#1 Bottleneck</Badge>}
                      <span>{st.activity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono-num font-semibold text-ink">
                    {formatDurationHours(st.median_wait_hours)}
                  </td>
                  <td className="px-4 py-4 font-mono-num text-ink">
                    {formatDurationHours(st.p90_wait_hours)}
                  </td>
                  <td className="px-4 py-4 font-mono-num text-ink">
                    {st.affected_cases}
                  </td>
                  <td className="px-4 py-4 font-mono-num text-ink">
                    {formatPct(st.rework_frequency)} ({st.rework_count})
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {st.department_breakdown.slice(0, 4).map((d) => (
                        <span
                          key={d.department}
                          className="rounded border border-hairline bg-porcelain px-2 py-0.5 font-mono-num text-[11px] text-ink-muted"
                        >
                          {d.department}: {formatDurationHours(d.median_wait_hours)}
                        </span>
                      ))}
                    </div>
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
