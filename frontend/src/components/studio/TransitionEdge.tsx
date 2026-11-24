"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { cn, formatDurationHours, formatPct } from "@/lib/utils";
import type { ProcessEdgeData } from "@/lib/api";

export type TransitionFlowEdgeData = ProcessEdgeData & {
  highlighted?: boolean;
  dimmed?: boolean;
  [key: string]: unknown;
};

export type TransitionFlowEdge = Edge<TransitionFlowEdgeData, "transition">;

export function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<TransitionFlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHighlighted = Boolean(data?.highlighted);
  const isDimmed = Boolean(data?.dimmed);
  const isRework = Boolean(data?.is_rework);
  const isBottleneck = Boolean(data?.is_bottleneck);

  const strokeColor = isHighlighted
    ? "#354D8A"
    : isBottleneck || isRework
    ? "#ED9D78"
    : "#A9B6CE";

  const strokeWidth = isHighlighted
    ? 2.8
    : Math.min(3.5, Math.max(1.25, ((data?.case_percentage ?? 10) / 100) * 3.2));

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isRework ? "5 4" : undefined,
          opacity: isDimmed ? 0.22 : 0.92,
        }}
      />
      {data && !isDimmed && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono-num text-[10px] font-medium shadow-xs",
              isHighlighted
                ? "border-indigo bg-indigo text-white"
                : isBottleneck || isRework
                ? "border-apricot bg-apricot-subtle text-ink"
                : "border-hairline bg-porcelain-elevated text-ink-muted"
            )}
          >
            {formatPct(data.case_percentage)} ·{" "}
            {formatDurationHours(data.median_elapsed_hours)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
