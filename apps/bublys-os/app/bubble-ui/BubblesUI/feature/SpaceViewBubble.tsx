"use client";
/**
 * 見え方 ── 海の見え方を変える口を集めた**1 つの泡**。
 *
 * 前は画面の左上に固定した帯だったが、新しい模型には**画面に固定した面の置き場所が無い**。
 * ほかと同じ泡にして、いつも見えていてほしければ**岸に貼る**（既定は左上の岸）。
 * 泡なので、要らなければ閉じられるし、引き剥がして海に浮かべることもできる。
 */
import { CSSProperties, FC } from "react";
import { Box } from "@mui/material";
import { PRESETS } from "@bublys-org/bubble-layout";
import type { PresetId } from "@bublys-org/bubble-layout";
import { FullscreenToggle } from "../../components/FullscreenToggle";
import { useSpaceView } from "./SpaceViewContext";

/** 口のボタン。押されているものだけ青く */
const chip = (active: boolean): CSSProperties => ({
  font: "13px/1.5 -apple-system, sans-serif",
  padding: "4px 12px",
  borderRadius: 7,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: `1px solid ${active ? "#4d8dff" : "rgba(255,255,255,.18)"}`,
  background: active ? "rgba(77,141,255,.18)" : "rgba(255,255,255,.06)",
  color: "#dce8ff",
});

export const SpaceViewBubble: FC = () => {
  const { preset, setPreset, join, setJoin, fisheye, toggleFisheye } = useSpaceView();
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", height: "100%", px: 0.5 }}>
      {/* ★ **並べ方**の口。開き方は 1 つしかないので、見え方が変わるのはここだけ */}
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as PresetId)}
        title="並べ方（軸ごとの 次元・並べ方・レンズ）"
        style={{ ...chip(false), padding: "4px 8px" }}
      >
        {(Object.keys(PRESETS) as PresetId[]).map((id) => (
          <option key={id} value={id} style={{ color: "#1b2029" }}>
            {PRESETS[id].label}
          </option>
        ))}
      </select>

      {/* ネオンの通し方。枝分かれ（T 字）か、泡の枠へ迂回するか */}
      <button
        onClick={() => setJoin(join === "branch" ? "detour" : "branch")}
        title={
          join === "branch"
            ? "いまは枝分かれ ── 岸の管はまっすぐ走り、泡の枠が T 字に分かれる"
            : "いまは迂回 ── 岸の管が泡の枠へ回り込み、泡と縁の間には通らない"
        }
        style={chip(false)}
      >
        {join === "branch" ? "枝分かれ" : "迂回"}
      </button>

      {/* 魚眼の向き。軸ごとのレンズをそのまま口にしてある（両方／どちらも無し も選べる） */}
      {(["x", "y"] as const).map((axis) => (
        <button
          key={axis}
          onClick={() => toggleFisheye(axis)}
          title={
            fisheye[axis]
              ? `${axis.toUpperCase()} は魚眼 ── この向きに、焦点から離れるほど小さくなる`
              : `${axis.toUpperCase()} は平行 ── この向きでは大きさが変わらない`
          }
          style={chip(fisheye[axis])}
        >
          魚眼{axis.toUpperCase()}
        </button>
      ))}
      <FullscreenToggle />
    </Box>
  );
};
