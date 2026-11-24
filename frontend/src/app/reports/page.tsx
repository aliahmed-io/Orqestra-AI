"use client";

import React, { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { api, type OverviewMetrics, type ReportRecord } from "@/lib/api";
import { formatDurationHours, formatPct, formatTimestamp } from "@/lib/utils";
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

export default function ReportsPage() {
  const { activeDatasetId, activeDataset } = useDataset();
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async (dsId: number) => {
    setLoading(true);
    try {
      const [ov, reps] = await Promise.all([
        api.getOverview(dsId),
        api.listReports(dsId),
      ]);
      setOverview(ov);
      setHistory(reps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDatasetId !== null) {
      void loadData(activeDatasetId);
    }
  }, [activeDatasetId]);

  const handleDownload = (format: "pdf" | "csv") => {
    if (activeDatasetId === null) return;
    window.open(api.getReportDownloadUrl(activeDatasetId, format), "_blank");
    setTimeout(() => {
      void loadData(activeDatasetId);
    }, 800);
  };

  if (loading || !overview || !activeDataset) {
    return <LoadingPanel label="Preparing management report..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Management Reports
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Export executive PDF and CSV reports containing overview metrics,
            bottlenecks, variants, delay predictions, and analytical limitations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleDownload("pdf")}>
            <FileText className="h-4 w-4" />
            <span>Export PDF Report</span>
          </Button>
          <Button variant="secondary" onClick={() => handleDownload("csv")}>
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV Summary</span>
          </Button>
        </div>
      </div>

      {/* Executive Summary Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Content Preview — {activeDataset.name}</CardTitle>
          <Badge tone="indigo">Live Derived Metrics</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-porcelain p-4">
            <div className="text-xs text-ink-muted">Cases Analyzed</div>
            <div className="mt-1 font-mono-num text-lg font-semibold">
              {overview.total_cases}
            </div>
          </div>
          <div className="rounded-md bg-porcelain p-4">
            <div className="text-xs text-ink-muted">Median Cycle Time</div>
            <div className="mt-1 font-mono-num text-lg font-semibold">
              {formatDurationHours(overview.median_cycle_time_hours)}
            </div>
          </div>
          <div className="rounded-md bg-porcelain p-4">
            <div className="text-xs text-ink-muted">Delayed Rate</div>
            <div className="mt-1 font-mono-num text-lg font-semibold">
              {formatPct(overview.delayed_rate)}
            </div>
          </div>
          <div className="rounded-md bg-porcelain p-4">
            <div className="text-xs text-ink-muted">Top Bottleneck</div>
            <div className="mt-1 font-display text-base font-semibold">
              {overview.main_bottleneck_stage ?? "N/A"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Generated Report History</CardTitle>
        </CardHeader>
        {history.length === 0 ? (
          <CardContent className="text-sm text-ink-muted">
            No reports exported yet for this dataset. Use the export buttons above
            to generate your first PDF or CSV report.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline bg-porcelain text-xs font-semibold text-ink-muted">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Generated At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3 font-medium text-ink">{r.title}</td>
                    <td className="px-4 py-3 uppercase">
                      <Badge tone="neutral">{r.report_format}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-ink-muted">
                      {(r.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {formatTimestamp(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleDownload(r.report_format as "pdf" | "csv")
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
