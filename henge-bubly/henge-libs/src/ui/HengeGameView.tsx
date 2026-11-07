"use client";
/** ゲーム 1 つの姿 ── 受け取ったものを描くだけ */
import { FC } from "react";
import { HengeGame_化ゲーム } from "@bublys-org/henge-model";

export type HengeGameViewProps = {
  game: HengeGame_化ゲーム;
  canUndo: boolean;
  canRedo: boolean;
  onAdvance: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenWorldLine: () => void;
};

const btn = (enabled: boolean) => ({
  padding: "6px 12px",
  fontSize: 13,
  borderRadius: 4,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: enabled ? "pointer" : "default",
  opacity: enabled ? 1 : 0.4,
});

export const HengeGameView: FC<HengeGameViewProps> = ({
  game, canUndo, canRedo, onAdvance, onUndo, onRedo, onOpenWorldLine,
}) => (
  <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ fontSize: 11, color: "#999", letterSpacing: "0.1em" }}>
      ゲーム #{game.id.slice(0, 8)}
    </div>

    {/* ★ ここが仕様の入る場所。いまは世界線が伸びることを示す数だけ */}
    <div
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10,
        border: "1px dashed #ddd", borderRadius: 8, color: "#888",
      }}
    >
      <div style={{ fontSize: 44, lineHeight: 1, color: "#333" }}>{game.revision}</div>
      <div style={{ fontSize: 12 }}>まだ中身がありません（仮の数）</div>
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button onClick={onAdvance} style={{ ...btn(true), background: "#d4503e", color: "#fff", border: "none" }}>
        1 つ変形する
      </button>
      <button onClick={onUndo} disabled={!canUndo} style={btn(canUndo)}>戻る</button>
      <button onClick={onRedo} disabled={!canRedo} style={btn(canRedo)}>進む</button>
      <button onClick={onOpenWorldLine} style={btn(true)}>世界線を見る</button>
    </div>
  </div>
);
