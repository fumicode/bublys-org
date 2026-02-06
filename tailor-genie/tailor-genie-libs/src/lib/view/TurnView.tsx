"use client";

import { FC } from "react";
import { Turn } from "@bublys-org/tailor-genie-model";

export type TurnViewProps = {
  turn: Turn;
  speakerName?: string;
  align?: "left" | "right";
};

export const TurnView: FC<TurnViewProps> = ({
  turn,
  speakerName,
  align = "left",
}) => {
  const isRight = align === "right";

  return (
    <div
      style={{
        padding: "8px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: isRight ? "flex-end" : "flex-start",
      }}
    >
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
        {speakerName || turn.speakerId}
      </div>
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: isRight ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isRight ? "#007bff" : "#e9ecef",
          color: isRight ? "white" : "#333",
          fontSize: 14,
          lineHeight: 1.4,
          wordBreak: "break-word",
        }}
      >
        {turn.message}
      </div>
    </div>
  );
};
