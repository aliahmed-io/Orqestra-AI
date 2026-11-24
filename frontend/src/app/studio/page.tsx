"use client";

import React, { useEffect, useState } from "react";
import { api, type ProcessGraph } from "@/lib/api";
import { useDataset } from "@/components/layout/DatasetContext";
import { Button, Card, LoadingPanel } from "@/components/ui/primitives";
import { ProcessCanvas } from "@/components/studio/ProcessCanvas";

export default function ProcessStudioPage() {
  const { activeDatasetId } = useDataset();
  const [graph, setGraph] = useState<ProcessGraph | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [processTypes, setProcessTypes] = useState<string[]>([]);
  const [department, setDepartment] = useState("All");
  const [processType, setProcessType] = useState("All");
  const [minCasePct, setMinCasePct] = useState(0);
  const [highlightCommon, setHighlightCommon] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeDatasetId === null) return;
    api.getFilters(activeDatasetId).then((f) => {
      setDepartments(f.departments);
      setProcessTypes(f.process_types);
    });
  }, [activeDatasetId]);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .getGraph(activeDatasetId, {
        department,
        process_type: processType,
        min_case_pct: minCasePct,
      })
      .then((res) => {
        if (!cancelled) setGraph(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId, department, processType, minCasePct]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Process Discovery Studio
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Directly-Follows Graph reconstructed from imported event sequences.
            Drag stages to arrange or select any stage to inspect transitions.
          </p>
        </div>

        <Button
          size="sm"
          variant={highlightCommon ? "primary" : "secondary"}
          onClick={() => setHighlightCommon((v) => !v)}
        >
          {highlightCommon ? "Showing Common Path" : "Highlight Common Path"}
        </Button>
      </div>

      {/* Filter & Density Controls */}
      <Card className="flex flex-wrap items-center gap-6 px-5 py-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="studio-dept"
            className="text-xs font-medium text-ink-muted"
          >
            Department
          </label>
          <select
            id="studio-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-8 rounded-md border border-hairline bg-porcelain px-2.5 text-xs font-medium text-ink focus:border-indigo focus:outline-none"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="studio-ptype"
            className="text-xs font-medium text-ink-muted"
          >
            Process Type
          </label>
          <select
            id="studio-ptype"
            value={processType}
            onChange={(e) => setProcessType(e.target.value)}
            className="h-8 rounded-md border border-hairline bg-porcelain px-2.5 text-xs font-medium text-ink focus:border-indigo focus:outline-none"
          >
            <option value="All">All Processes</option>
            {processTypes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="studio-detail"
            className="text-xs font-medium text-ink-muted"
          >
            Min Path Frequency
          </label>
          <input
            id="studio-detail"
            type="range"
            min={0}
            max={25}
            step={5}
            value={minCasePct}
            onChange={(e) => setMinCasePct(Number(e.target.value))}
            className="w-28 accent-indigo"
          />
          <span className="font-mono-num text-xs font-medium text-ink">
            {minCasePct}%
          </span>
        </div>

        {graph && (
          <div className="ml-auto flex items-center gap-4 text-xs text-ink-muted">
            <span className="font-mono-num font-medium text-ink">
              {graph.total_cases_in_filter} cases
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-indigo" />
              Standard
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-apricot" />
              Bottleneck / Rework
            </span>
          </div>
        )}
      </Card>

      {loading || !graph ? (
        <LoadingPanel label="Reconstructing process flow graph..." />
      ) : (
        <ProcessCanvas graph={graph} highlightCommonPath={highlightCommon} />
      )}
    </div>
  );
}
