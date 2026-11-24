"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import { RotateCcw } from "lucide-react";
import type { ProcessGraph, ProcessNodeData } from "@/lib/api";
import { ActivityNode, type ActivityFlowNode } from "./ActivityNode";
import { TransitionEdge, type TransitionFlowEdge } from "./TransitionEdge";
import { ActivityInspector } from "./ActivityInspector";

const nodeTypes = { activity: ActivityNode };
const edgeTypes = { transition: TransitionEdge };

export function ProcessCanvas({
  graph,
  highlightCommonPath,
}: {
  graph: ProcessGraph;
  highlightCommonPath: boolean;
}) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<ActivityFlowNode>([]);

  const commonEdgeSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < graph.common_path.length - 1; i++) {
      const u = graph.common_path[i];
      const v = graph.common_path[i + 1];
      if (u && v) {
        set.add(`${u}__to__${v}`);
      }
    }
    return set;
  }, [graph.common_path]);

  const commonNodeSet = useMemo(
    () => new Set(graph.common_path),
    [graph.common_path]
  );

  // Sync nodes when graph data or highlight/selection changes, preserving user-dragged positions
  useEffect(() => {
    setNodes((prevNodes) => {
      const prevPositions = new Map(
        prevNodes.map((pn) => [pn.id, pn.position])
      );
      return graph.nodes.map((n) => {
        const isSelected = selectedActivity === n.activity;
        const inCommon = highlightCommonPath && commonNodeSet.has(n.activity);
        const connectedToSelected =
          selectedActivity !== null &&
          (n.activity === selectedActivity ||
            graph.edges.some(
              (e) =>
                (e.source === selectedActivity && e.target === n.activity) ||
                (e.target === selectedActivity && e.source === n.activity)
            ));

        const dimmed =
          (highlightCommonPath && !inCommon) ||
          (selectedActivity !== null && !connectedToSelected);

        return {
          id: n.id,
          type: "activity",
          position: prevPositions.get(n.id) ?? { x: n.x, y: n.y },
          draggable: true,
          selected: isSelected,
          data: {
            ...n,
            highlighted: inCommon || isSelected,
            dimmed,
          },
        };
      });
    });
  }, [
    graph.nodes,
    graph.edges,
    selectedActivity,
    highlightCommonPath,
    commonNodeSet,
    setNodes,
  ]);

  const resetLayout = () => {
    setNodes((prevNodes) => {
      const deterministicMap = new Map(
        graph.nodes.map((n) => [n.id, { x: n.x, y: n.y }])
      );
      return prevNodes.map((pn) => ({
        ...pn,
        position: deterministicMap.get(pn.id) ?? pn.position,
      }));
    });
  };

  const flowEdges: TransitionFlowEdge[] = useMemo(() => {
    return graph.edges.map((e) => {
      const inCommon = highlightCommonPath && commonEdgeSet.has(e.id);
      const connectedToSelected =
        selectedActivity !== null &&
        (e.source === selectedActivity || e.target === selectedActivity);

      const dimmed =
        (highlightCommonPath && !inCommon) ||
        (selectedActivity !== null && !connectedToSelected);

      const highlighted = inCommon || connectedToSelected;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "transition",
        animated: highlighted,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: highlighted
            ? "#354D8A"
            : e.is_bottleneck || e.is_rework
            ? "#ED9D78"
            : "#A9B6CE",
        },
        data: {
          ...e,
          highlighted,
          dimmed,
        },
      };
    });
  }, [graph.edges, selectedActivity, highlightCommonPath, commonEdgeSet]);

  const handleNodeClick: NodeMouseHandler<ActivityFlowNode> = (_ev, node) => {
    setSelectedActivity((prev) => (prev === node.id ? null : node.id));
  };

  const selectedNodeData: ProcessNodeData | undefined = graph.nodes.find(
    (n) => n.activity === selectedActivity
  );

  return (
    <div className="flex h-[640px] w-full flex-col overflow-hidden rounded-lg border border-hairline bg-porcelain-elevated lg:flex-row">
      <div className="relative flex-1 bg-porcelain/60">
        <button
          type="button"
          onClick={resetLayout}
          title="Reset nodes to deterministic layout"
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md border border-hairline bg-porcelain-elevated px-2.5 py-1.5 text-xs font-medium text-ink shadow-xs hover:bg-porcelain-recessed"
        >
          <RotateCcw className="h-3.5 w-3.5 text-indigo" />
          <span>Reset Layout</span>
        </button>

        <ReactFlow
          nodes={nodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedActivity(null)}
          nodesDraggable
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.35}
          maxZoom={1.8}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#D4DCE8"
          />
          <Controls showInteractive />
          <MiniMap
            nodeColor={(n) =>
              (n.data as { is_bottleneck?: boolean })?.is_bottleneck
                ? "#ED9D78"
                : "#354D8A"
            }
            maskColor="rgba(245, 243, 238, 0.75)"
            className="!border !border-hairline !bg-white"
          />
        </ReactFlow>
      </div>

      {selectedNodeData && (
        <ActivityInspector
          node={selectedNodeData}
          edges={graph.edges}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
}
