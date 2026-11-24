"use client";

import React, { useEffect, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { api, type CaseDetail, type PaginatedCases } from "@/lib/api";
import { formatDurationHours, formatTimestamp } from "@/lib/utils";
import { useDataset } from "@/components/layout/DatasetContext";
import {
  Badge,
  Button,
  Card,
  LoadingPanel,
} from "@/components/ui/primitives";

export default function CaseExplorerPage() {
  const { activeDatasetId } = useDataset();
  const [casesPage, setCasesPage] = useState<PaginatedCases | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (activeDatasetId === null) return;
    api.getFilters(activeDatasetId).then((f) => setDepartments(f.departments));
  }, [activeDatasetId]);

  useEffect(() => {
    if (activeDatasetId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .listCases(activeDatasetId, {
        page,
        page_size: 15,
        search,
        status,
        department,
        delayed_only: delayedOnly,
      })
      .then((res) => {
        if (!cancelled) setCasesPage(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDatasetId, page, search, status, department, delayedOnly]);

  const inspectCase = async (caseId: number) => {
    if (activeDatasetId === null) return;
    setDetailLoading(true);
    try {
      const detail = await api.getCaseDetail(activeDatasetId, caseId);
      setSelectedCase(detail);
    } finally {
      setDetailLoading(false);
    }
  };

  const maxWaitInSelected = selectedCase
    ? Math.max(
        1,
        ...selectedCase.events.map((e) => e.wait_from_prev_hours ?? 0)
      )
    : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Case Explorer
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Inspect individual process instances, inter-event waiting timelines, and
          deviations from the standard workflow variant.
        </p>
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            aria-label="Search by Case ID"
            placeholder="Search Case ID (e.g. PR-1042)..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="h-9 w-full rounded-md border border-hairline bg-porcelain pl-9 pr-3 text-sm text-ink focus:border-indigo focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by completion status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-9 rounded-md border border-hairline bg-porcelain px-3 text-xs font-medium text-ink"
        >
          <option value="All">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="open">Open</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          aria-label="Filter by department"
          value={department}
          onChange={(e) => {
            setPage(1);
            setDepartment(e.target.value);
          }}
          className="h-9 rounded-md border border-hairline bg-porcelain px-3 text-xs font-medium text-ink"
        >
          <option value="All">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={delayedOnly}
            onChange={(e) => {
              setPage(1);
              setDelayedOnly(e.target.checked);
            }}
            className="h-4 w-4 accent-indigo"
          />
          Delayed only
        </label>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className={
            selectedCase
              ? "overflow-hidden lg:col-span-2"
              : "overflow-hidden lg:col-span-3"
          }
        >
          {loading || !casesPage ? (
            <LoadingPanel label="Loading cases..." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-hairline bg-porcelain text-xs font-semibold text-ink-muted">
                    <tr>
                      <th className="px-5 py-3">Case ID</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Steps</th>
                      <th className="px-4 py-3">Cycle Time</th>
                      <th className="px-4 py-3">Delay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {casesPage.items.map((c) => {
                      const isActive = selectedCase?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => void inspectCase(c.id)}
                          className={`cursor-pointer transition-colors ${
                            isActive
                              ? "bg-indigo-subtle/40"
                              : "hover:bg-porcelain/70"
                          }`}
                        >
                          <td className="px-5 py-3 font-mono-num font-semibold text-indigo">
                            {c.case_key}
                          </td>
                          <td className="px-4 py-3 text-ink">
                            {c.department ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                c.status === "completed"
                                  ? "success"
                                  : c.status === "open"
                                  ? "indigo"
                                  : "danger"
                              }
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 font-mono-num text-xs text-ink">
                              <span>{c.event_count}</span>
                              {c.rework_count > 0 && (
                                <span
                                  title={`${c.rework_count} rework loop(s)`}
                                  className="inline-flex items-center gap-0.5 rounded bg-apricot-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink"
                                >
                                  <RotateCcw className="h-2.5 w-2.5 text-apricot" />
                                  {c.rework_count}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono-num text-ink">
                            {formatDurationHours(c.cycle_time_hours)}
                          </td>
                          <td className="px-4 py-3">
                            {c.is_delayed ? (
                              <Badge tone="apricot">Delayed</Badge>
                            ) : (
                              <span className="text-xs text-ink-muted">
                                On track
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-hairline px-5 py-3 text-xs text-ink-muted">
                <span>
                  Page {casesPage.page} of {casesPage.total_pages} (
                  {casesPage.total} cases)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= casesPage.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Event Timeline Inspector */}
        {(selectedCase || detailLoading) && (
          <Card className="p-5">
            {detailLoading || !selectedCase ? (
              <LoadingPanel label="Loading case timeline..." />
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-hairline pb-3">
                  <div>
                    <div className="font-mono-num text-base font-bold text-indigo">
                      {selectedCase.case_key}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {selectedCase.department ?? "Unassigned"} ·{" "}
                      {selectedCase.priority ?? "Standard"} Priority
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close case detail"
                    onClick={() => setSelectedCase(null)}
                    className="rounded p-1 text-ink-muted hover:bg-porcelain-recessed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Variant comparison */}
                <div className="rounded-md border border-hairline bg-porcelain p-3 text-xs">
                  <div className="font-semibold text-ink">
                    Variant Alignment:{" "}
                    {selectedCase.matches_common_variant ? (
                      <span className="text-emerald-700">
                        Matches Standard Path
                      </span>
                    ) : (
                      <span className="text-amber-700">
                        Deviates from Standard
                      </span>
                    )}
                  </div>
                  {selectedCase.deviations.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-ink-muted">
                      {selectedCase.deviations.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Chronological Event Timeline with proportional wait bars */}
                <div>
                  <h4 className="text-xs font-semibold text-ink">
                    Event Timeline ({selectedCase.events.length} events)
                  </h4>
                  <ol className="mt-3 space-y-3.5 border-l-2 border-soft-slate pl-4">
                    {selectedCase.events.map((ev) => {
                      const waitPct =
                        ev.wait_from_prev_hours !== null
                          ? Math.min(
                              100,
                              (ev.wait_from_prev_hours / maxWaitInSelected) * 100
                            )
                          : 0;
                      return (
                        <li key={ev.id} className="relative text-xs">
                          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo" />
                          <div className="flex items-center justify-between font-semibold text-ink">
                            <span>{ev.activity}</span>
                            {ev.wait_from_prev_hours !== null && (
                              <span className="font-mono-num text-[11px] text-ink-muted">
                                +{formatDurationHours(ev.wait_from_prev_hours)}
                              </span>
                            )}
                          </div>
                          {ev.wait_from_prev_hours !== null &&
                            ev.wait_from_prev_hours > 0 && (
                              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-porcelain-recessed">
                                <div
                                  className="h-full rounded-full bg-apricot"
                                  style={{ width: `${waitPct}%` }}
                                />
                              </div>
                            )}
                          <div className="mt-1 text-[11px] text-ink-muted">
                            {formatTimestamp(ev.timestamp)}
                            {ev.assigned_role ? ` · ${ev.assigned_role}` : ""}
                            {ev.outcome ? ` · ${ev.outcome}` : ""}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
