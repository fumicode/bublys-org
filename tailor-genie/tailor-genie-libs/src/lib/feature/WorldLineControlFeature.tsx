"use client";

import { FC } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";

export const WorldLineControlFeature: FC = () => {
  const scope = useCasScope("tailor-genie");

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
        onClick={scope.moveBack}
        disabled={!scope.canUndo}
        style={{
          padding: "4px 12px",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: scope.canUndo ? "#fff" : "#f5f5f5",
          color: scope.canUndo ? "#333" : "#aaa",
          cursor: scope.canUndo ? "pointer" : "default",
          fontSize: 13,
        }}
      >
        Undo
      </button>
      <button
        onClick={scope.moveForward}
        disabled={!scope.canRedo}
        style={{
          padding: "4px 12px",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: scope.canRedo ? "#fff" : "#f5f5f5",
          color: scope.canRedo ? "#333" : "#aaa",
          cursor: scope.canRedo ? "pointer" : "default",
          fontSize: 13,
        }}
      >
        Redo
      </button>
    </div>
  );
};
