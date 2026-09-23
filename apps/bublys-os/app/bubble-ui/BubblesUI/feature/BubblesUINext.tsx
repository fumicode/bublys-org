"use client";
/**
 * デモの海を、泡のならべかた（5つの規則）の上に載せたもの。
 *
 * 決めた形 ── **Z を使わない**:
 *   - 重なりを作るのは並べ方。開いた泡は直前に開いたものの右下へずらして**重ねる**
 *   - 大きさは X の魚眼。焦点に近いほど大きい
 *   - 前後は「大きく写るものが手前」。触ると焦点が寄って入れ替わる（値は書かない）
 *
 * 旧 {@link BubblesUI} は残してある ── 岸と世界線をこちらへ戻すまでの見本として。
 *
 * まだ載っていないもの（順に戻す）:
 *   1. 岸（Showre）とネオン … 旧 `BubblesLayeredView` の中にある
 *   2. 世界線 … このリポジトリ独自の作りがあるので、それを読んでから繋ぐ
 */
import { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { BubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { OpenDepth } from "@bublys-org/bubble-layout-feature";
import { bubbleRoutes } from "../domain/bubbleRoutes";
import { bridgeRoutes } from "./legacyRouteBridge";
import { FullscreenToggle } from "../../components/FullscreenToggle";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

/** 最初に開くもの。root には必ずランチャーが 1 つ居る */
const INITIAL_URLS = ["launchers/main"];

export const BubblesUINext = () => {
  const [depth, setDepth] = useState<OpenDepth>("cascade");
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ランチャー集約（呼び出しの中身）は Redux にある。泡として出すのは海の仕事
  useEnsureMainLauncherEntity();

  const routes = useMemo(() => bridgeRoutes(bubbleRoutes), []);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(145deg, hsl(220, 35%, 18%) 0%, hsl(225, 40%, 22%) 40%, hsl(230, 35%, 20%) 100%)",
      }}
    >
      <BubbleSpace
        key={depth}
        routes={routes}
        initialUrls={INITIAL_URLS}
        viewport={viewport}
        depth={depth}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* 開き方を見比べる口。決めた既定は「重ねて開く」 */}
      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 1000, display: "flex", gap: 1, alignItems: "center" }}>
        {(["cascade", "fisheye-x", "plane"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            style={{
              font: "13px/1.5 -apple-system, sans-serif",
              padding: "4px 12px",
              borderRadius: 7,
              cursor: "pointer",
              border: `1px solid ${depth === d ? "#4d8dff" : "rgba(255,255,255,.18)"}`,
              background: depth === d ? "rgba(77,141,255,.18)" : "rgba(255,255,255,.06)",
              color: "#dce8ff",
            }}
          >
            {d === "cascade" ? "重ねて開く" : d === "fisheye-x" ? "隣に開く" : "面"}
          </button>
        ))}
        <FullscreenToggle />
      </Box>
    </Box>
  );
};
