"use client";

import React from "react";
import { ArrowRight, X } from "lucide-react";
import { motion } from "motion/react";
import type { ProcessEdgeData, ProcessNodeData } from "@/lib/api";
import { formatDurationHours, formatPct } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

export function ActivityInspector({
  node,
  edges,
  onClose,
}: {
  node: ProcessNodeData;
  edges: ProcessEdgeData[];
  onClose: () => void;
}) {
  const incoming = edges.filter((e) => e.target === node.activity);
  const outgoing = edges.filter((e) => e.source === node.activity);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      aria-label="Activity Inspector"
      className="flex h-full w-full flex-col border-l border-hairline bg-porcelain-elevated p-5 lg:w-80"
    >
      <div className="flex items-start justify-between border-b border-hairline pb-4">
        <div>
          <div className="text-[11px] font-semibold text-ink-muted">
            Stage Inspection
          </div>
          <h3 className="mt-1 font-display text-base font-bold text-ink">
            {node.activity}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded-md p-1 text-ink-muted hover:bg-porcelain-recessed hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {node.is_bottleneck && <Badge tone="apricot">Bottleneck Stage</Badge>}
        {node.rework_count > 0 && (
          <Badge tone="neutral">{node.rework_count} Rework Loops</Badge>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-hairline bg-porcelain p-3.5 text-xs">
        <div>
          <dt className="text-ink-muted">Cases</dt>
          <dd className="mt-0.5 font-mono-num text-sm font-semibold text-ink">
            {node.case_count} ({formatPct(node.frequency_pct)})
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Total Events</dt>
          <dd className="mt-0.5 font-mono-num text-sm font-semibold text-ink">
            {node.event_count}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Median Wait</dt>
          <dd className="mt-0.5 font-mono-num text-sm font-semibold text-ink">
            {formatDurationHours(node.median_wait_to_next_hours)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">P90 Wait</dt>
          <dd className="mt-0.5 font-mono-num text-sm font-semibold text-ink">
            {formatDurationHours(node.p90_wait_to_next_hours)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
        <div>
          <h4 className="text-xs font-semibold text-ink">
            Outgoing Transitions ({outgoing.length})
          </h4>
          <div className="mt-2 space-y-2">
            {outgoing.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Terminal stage (no outgoing transitions).
              </p>
            ) : (
              outgoing.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md border border-hairline bg-white p-2.5 text-xs transition-colors hover:border-soft-slate"
                >
                  <div className="flex items-center justify-between font-medium text-ink">
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 text-indigo" />
                      {e.target}
                    </span>
                    <span className="font-mono-num text-indigo">
                      {formatPct(e.case_percentage)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
                    <span>{e.transition_count} transitions</span>
                    <span className="font-mono-num">
                      Median {formatDurationHours(e.median_elapsed_hours)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-ink">
            Incoming Transitions ({incoming.length})
          </h4>
          <div className="mt-2 space-y-2">
            {incoming.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Entry stage (no incoming transitions).
              </p>
            ) : (
              incoming.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md border border-hairline bg-white p-2.5 text-xs transition-colors hover:border-soft-slate"
                >
                  <div className="flex items-center justify-between font-medium text-ink">
                    <span>{e.source}</span>
                    <span className="font-mono-num text-ink-muted">
                      {formatPct(e.case_percentage)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
                    <span>{e.transition_count} transitions</span>
                    <span className="font-mono-num">
                      Median {formatDurationHours(e.median_elapsed_hours)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
