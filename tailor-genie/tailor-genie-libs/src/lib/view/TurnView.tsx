"use client";

import { FC } from "react";
import { Turn, SpeakerRole } from "@bublys-org/tailor-genie-model";

export type TurnViewProps = {
  turn: Turn;
  speakerName?: string;
  speakerRole?: SpeakerRole;
  align?: "left" | "right";
};

const BUBBLE_COLORS: Record<SpeakerRole, { bg: string; color: string }> = {
  host: { bg: "#6f42c1", color: "white" },
  guest: { bg: "#28a745", color: "white" },
};

export const TurnView: FC<TurnViewProps> = ({
  turn,
  speakerName,
  speakerRole = "guest",
  align = "left",
}) => {
  const isRight = align === "right";
  const colors = BUBBLE_COLORS[speakerRole];

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
          background: colors.bg,
          color: colors.color,
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
