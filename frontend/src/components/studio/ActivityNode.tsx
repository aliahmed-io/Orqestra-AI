"use client";

import React from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn, formatDurationHours, formatPct } from "@/lib/utils";
import type { ProcessNodeData } from "@/lib/api";

export type ActivityFlowNodeData = ProcessNodeData & {
  highlighted?: boolean;
  dimmed?: boolean;
  [key: string]: unknown;
};

export type ActivityFlowNode = Node<ActivityFlowNodeData, "activity">;

export function ActivityNode({ data, selected }: NodeProps<ActivityFlowNode>) {
  const isBottleneck = data.is_bottleneck;
  const isHighlighted = Boolean(data.highlighted);
  const isDimmed = Boolean(data.dimmed);

  return (
    <div
      className={cn(
        "w-[224px] rounded-lg border bg-porcelain-elevated px-4 py-3 transition-all duration-150",
        selected
          ? "border-indigo ring-2 ring-indigo/25 shadow-md"
          : isHighlighted
          ? "border-indigo shadow-sm"
          : isBottleneck
          ? "border-apricot shadow-sm"
          : "border-hairline shadow-[0_1px_2px_rgba(36,43,58,0.06)]",
        isBottleneck && "border-l-4 border-l-apricot",
        isDimmed && "opacity-40"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-sm font-semibold leading-snug text-ink">
          {data.activity}
        </div>
        {isBottleneck && (
          <span
            title="Bottleneck Stage"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-apricot-subtle px-2 py-0.5 text-[10px] font-semibold text-ink"
          >
            <AlertTriangle className="h-3 w-3 text-apricot" />
            Bottleneck
          </span>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-hairline pt-2.5 text-xs">
        <div>
          <div className="text-[11px] text-ink-muted">Cases</div>
          <div className="font-mono-num font-semibold text-ink">
            {data.case_count}{" "}
            <span className="text-[11px] font-normal text-ink-muted">
              ({formatPct(data.frequency_pct)})
            </span>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-ink-muted">Median wait</div>
          <div
            className={cn(
              "font-mono-num font-semibold",
              isBottleneck ? "text-amber-700" : "text-ink"
            )}
          >
            {data.median_wait_to_next_hours > 0
              ? formatDurationHours(data.median_wait_to_next_hours)
              : "Terminal"}
          </div>
        </div>
      </div>

      {data.rework_count > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
          <RotateCcw className="h-3 w-3 text-apricot" />
          <span className="font-mono-num">{data.rework_count}</span>
          <span>rework occurrences</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo"
      />
    </div>
  );
}
