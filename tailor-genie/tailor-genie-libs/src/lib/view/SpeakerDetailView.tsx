"use client";

import { FC } from "react";
import { Speaker, SpeakerRole } from "@bublys-org/tailor-genie-model";

export type SpeakerDetailViewProps = {
  speaker: Speaker;
};

const ROLE_LABELS: Record<SpeakerRole, string> = {
  host: "ホスト（テイラー）",
  guest: "ゲスト",
};

const ROLE_COLORS: Record<SpeakerRole, string> = {
  host: "#6f42c1",
  guest: "#28a745",
};

const ROLE_DESCRIPTIONS: Record<SpeakerRole, string> = {
  host: "スーツの提案やおすすめを行うテイラーです",
  guest: "提案を受けるお客様です",
};

export const SpeakerDetailView: FC<SpeakerDetailViewProps> = ({ speaker }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #ddd",
          background: "#f5f5f5",
          fontWeight: "bold",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>スピーカー詳細</span>
        <span
          style={{
            padding: "4px 8px",
            background: ROLE_COLORS[speaker.role],
            color: "white",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: "bold",
          }}
        >
          {ROLE_LABELS[speaker.role]}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>ID</div>
          <div style={{ fontSize: 14 }}>{speaker.id}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>名前</div>
          <div style={{ fontSize: 18, fontWeight: "bold" }}>{speaker.name}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>役割</div>
          <div style={{ fontSize: 14 }}>{ROLE_DESCRIPTIONS[speaker.role]}</div>
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 12,
            background: "#e3f2fd",
            borderRadius: 8,
            fontSize: 12,
            color: "#1976d2",
          }}
        >
          💡 このスピーカーを会話にドラッグ＆ドロップして追加できます
        </div>
      </div>
    </div>
  );
};
