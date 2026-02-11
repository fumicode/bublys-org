"use client";

import { FC } from "react";
import { useWorldLineGraph } from "@bublys-org/world-line-graph";

export const WorldLineControlFeature: FC = () => {
  const { graph, moveBack, moveForward } = useWorldLineGraph();

  const apexNode = graph.state.apexNodeId
    ? graph.state.nodes[graph.state.apexNodeId]
    : null;
  const canUndo =
    apexNode?.parentId !== null && apexNode?.parentId !== undefined;
  const childrenMap = graph.getChildrenMap();
  const canRedo =
    apexNode !== null && (childrenMap[apexNode.id]?.length ?? 0) > 0;

  const nodeCount = Object.keys(graph.state.nodes).length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
      }}
    >
      <button
        onClick={moveBack}
        disabled={!canUndo}
        style={{
          padding: "4px 12px",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: canUndo ? "#fff" : "#f5f5f5",
          color: canUndo ? "#333" : "#aaa",
          cursor: canUndo ? "pointer" : "default",
          fontSize: 13,
        }}
      >
        Undo
      </button>
      <button
        onClick={moveForward}
        disabled={!canRedo}
        style={{
          padding: "4px 12px",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: canRedo ? "#fff" : "#f5f5f5",
          color: canRedo ? "#333" : "#aaa",
          cursor: canRedo ? "pointer" : "default",
          fontSize: 13,
        }}
      >
        Redo
      </button>
      {nodeCount > 0 && (
        <span style={{ fontSize: 11, color: "#999" }}>
          {nodeCount} nodes
        </span>
      )}
    </div>
  );
};
