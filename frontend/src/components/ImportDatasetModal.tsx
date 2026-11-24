"use client";

import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { useDataset } from "@/components/layout/DatasetContext";

export function ImportDatasetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { refreshDatasets } = useDataset();
  const [name, setName] = useState("");
  const [processType, setProcessType] = useState("Purchase Request Approval");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.name.toLowerCase().endsWith(".csv") && dropped.type !== "text/csv") {
        setError("Please drop a valid .csv event-log file.");
        return;
      }
      setError(null);
      setFile(dropped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Select or drop a CSV event-log file to import.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim() || file.name.replace(/\.csv$/i, ""));
      fd.append("process_type", processType.trim() || "Purchase Request Approval");
      if (description.trim()) {
        fd.append("description", description.trim());
      }
      const created = await api.importDataset(fd);
      await refreshDatasets(created.id);
      setName("");
      setDescription("");
      setFile(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import CSV");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-hairline bg-porcelain-elevated p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <h2
              id="import-modal-title"
              className="font-display text-lg font-semibold text-ink"
            >
              Import Event Log (CSV)
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Required columns: <code className="font-mono-num">case_id</code>,{" "}
              <code className="font-mono-num">activity</code>,{" "}
              <code className="font-mono-num">timestamp</code>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import modal"
            className="rounded-md p-1.5 text-ink-muted hover:bg-porcelain-recessed hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="ds-name"
              className="block text-xs font-medium text-ink"
            >
              Dataset Name
            </label>
            <input
              id="ds-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Procurement Approvals"
              className="mt-1.5 w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-ink focus:border-indigo focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ds-process-type"
              className="block text-xs font-medium text-ink"
            >
              Process Type
            </label>
            <input
              id="ds-process-type"
              type="text"
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-ink focus:border-indigo focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ds-file"
              className="block text-xs font-medium text-ink"
            >
              CSV Event Log File
            </label>
            <label
              htmlFor="ds-file"
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm transition-colors",
                isDragging
                  ? "border-indigo bg-indigo-subtle/60 text-indigo"
                  : "border-soft-slate bg-porcelain text-ink-muted hover:border-indigo hover:text-ink"
              )}
            >
              <Upload className="h-4 w-4 text-indigo" />
              <span>
                {file
                  ? file.name
                  : isDragging
                  ? "Drop .csv file here"
                  : "Drag & drop .csv file or click to browse"}
              </span>
              <input
                id="ds-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Analyzing Log..." : "Import & Analyze"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
