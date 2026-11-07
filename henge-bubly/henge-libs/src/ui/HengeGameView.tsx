"use client";
/** ゲーム 1 つの姿 ── 受け取ったものを描くだけ */
import { FC } from "react";
import {
  HengeGame_化ゲーム,
  methodsFor,
  PIECE_KIND_LABEL,
  type HengeMethodDef,
  type Piece_もの,
} from "@bublys-org/henge-model";

export type HengeGameViewProps = {
  game: HengeGame_化ゲーム;
  selected: string[];
  busy: string | null;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onToggle: (id: string) => void;
  onPerform: (method: HengeMethodDef) => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenWorldLine: () => void;
};

const KIND_COLOR: Record<string, string> = {
  kanji: "#d4503e", radical: "#c98a2b", reading: "#3e7bd4", meaning: "#3ea86b", word: "#8a4fd4",
  chimera: "#888", nonsense: "#888", nonword: "#888",
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

const PieceChip: FC<{ piece: Piece_もの; order: number; onClick: () => void }> = ({ piece, order, onClick }) => (
  <button
    onClick={onClick}
    style={{
      position: "relative", minWidth: 64, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
      background: "#fff", border: `2px ${piece.isNon ? "dashed" : "solid"} ${order >= 0 ? "#222" : KIND_COLOR[piece.kind]}`,
      boxShadow: order >= 0 ? "0 0 0 3px #ffd54f" : "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}
  >
    <span style={{ fontSize: 10, color: KIND_COLOR[piece.kind] }}>{PIECE_KIND_LABEL[piece.kind]}</span>
    <span style={{ fontSize: 28, lineHeight: 1.1, color: "#222" }}>{piece.text}</span>
    {piece.gloss && <span style={{ fontSize: 10, color: "#888" }}>{piece.gloss}</span>}
    {order >= 0 && (
      <span style={{ position: "absolute", top: -8, right: -8, background: "#222", color: "#fff", borderRadius: 9, width: 18, height: 18, fontSize: 11 }}>
        {order + 1}
      </span>
    )}
  </button>
);

export const HengeGameView: FC<HengeGameViewProps> = ({
  game, selected, busy, error, canUndo, canRedo, onToggle, onPerform, onUndo, onRedo, onOpenWorldLine,
}) => {
  const pieces = selected.map((id) => game.field.find((p) => p.id === id)).filter(Boolean) as Piece_もの[];
  const methods = methodsFor(pieces);
  const ended = game.isCleared || game.isOver;

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 22 }}>
          {game.state.start || "？"} <span style={{ color: "#aaa" }}>▶</span> {game.state.goal || "？"}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 600 }}>🪣 {game.wallet} バケ</div>
      </div>

      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 10, padding: 10, border: "1px dashed #ddd", borderRadius: 8, overflow: "auto" }}>
        {game.field.map((p) => (
          <PieceChip key={p.id} piece={p} order={selected.indexOf(p.id)} onClick={() => onToggle(p.id)} />
        ))}
        {!game.isSetUp && <div style={{ color: "#888", fontSize: 13 }}>{busy ?? "盤面を待っています…"}</div>}
      </div>

      {ended ? (
        <div style={{ padding: 12, borderRadius: 8, background: game.isCleared ? "#fff4d6" : "#eee", fontSize: 14 }}>
          {game.isCleared ? "🎉 ゴール！" : "💀 バケが尽きました"}　残り {game.wallet} バケ − 非のもの減点 {game.penalty} ＝ <b>{game.score} 点</b>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minHeight: 32 }}>
          {pieces.length === 0 && <span style={{ fontSize: 12, color: "#999" }}>ものを選ぶと変化の方法が出ます（2つ選ぶと合わせる方法）</span>}
          {pieces.length > 0 && methods.length === 0 && <span style={{ fontSize: 12, color: "#999" }}>この組み合わせで使える方法はありません</span>}
          {methods.map((m) => {
            const ok = !busy && game.canPerform(m, selected);
            return (
              <button key={m.id} disabled={!ok} onClick={() => onPerform(m)} style={{ ...btn(ok), background: "#d4503e", color: "#fff", border: "none" }}>
                {m.label}（{m.cost}バケ）
              </button>
            );
          })}
        </div>
      )}

      {busy && game.isSetUp && <div style={{ fontSize: 12, color: "#888" }}>{busy}</div>}
      {error && <div style={{ fontSize: 12, color: "#c00" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onUndo} disabled={!canUndo} style={btn(canUndo)}>戻る</button>
        <button onClick={onRedo} disabled={!canRedo} style={btn(canRedo)}>進む</button>
        <button onClick={onOpenWorldLine} style={btn(true)}>世界線を見る</button>
      </div>
    </div>
  );
};
