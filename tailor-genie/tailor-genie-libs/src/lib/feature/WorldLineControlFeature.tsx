"use client";

import { FC } from "react";
import { useWorldLineGraph } from "@bublys-org/world-line-graph";

export const WorldLineControlFeature: FC = () => {
  const { graph, moveBack, moveForward } = useWorldLineGraph();

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
        disabled={!graph.canUndo}
        style={{
          padding: "4px 12px",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: graph.canUndo ? "#fff" : "#f5f5f5",
          color: graph.canUndo ? "#333" : "#aaa",
          cursor: graph.canUndo ? "pointer" : "default",
          fontSize: 13,
        }}
      >
        Undo
      </button>
      <button
        onClick={moveForward}
        disabled={!graph.canRedo}
        style={{
          padding: "4px 12px",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: graph.canRedo ? "#fff" : "#f5f5f5",
          color: graph.canRedo ? "#333" : "#aaa",
          cursor: graph.canRedo ? "pointer" : "default",
          fontSize: 13,
        }}
      >
        Redo
      </button>
    </div>
  );
};
