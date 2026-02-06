"use client";

import { FC } from "react";
import { Turn } from "@bublys-org/tailor-genie-model";

export type TurnViewProps = {
  turn: Turn;
  userName?: string;
  onDelete?: (turnId: string) => void;
};

export const TurnView: FC<TurnViewProps> = ({ turn, userName, onDelete }) => {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
          {userName || turn.userId}
        </div>
        <div style={{ fontSize: 14 }}>{turn.message}</div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(turn.id)}
          style={{
            background: "none",
            border: "none",
            color: "#999",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          削除
        </button>
      )}
    </div>
  );
};
