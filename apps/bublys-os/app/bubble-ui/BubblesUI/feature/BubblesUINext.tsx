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
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { BubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { OpenDepth } from "@bublys-org/bubble-layout-feature";
import { TUBE_RADIUS, anchoredRect, type ScreenRect } from "@bublys-org/bubbles-ui";
import { renderRoute, useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleSpaceApi } from "@bublys-org/bubble-layout-feature";
import { bubbleRoutes } from "../domain/bubbleRoutes";
import { ShowreLayer, resolveDock, type Docked } from "./ShowreLayer";
import { bridgeRoutes } from "./legacyRouteBridge";
import { FullscreenToggle } from "../../components/FullscreenToggle";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

/** 最初に開くもの。root には必ずランチャーが 1 つ居る */
const INITIAL_URLS = ["launchers/main"];

/** 海の口を外から掴むための小物（`BubbleSpace` の中でしか使えないので、子として置く） */
const SpaceHandle: FC<{ onReady: (api: BubbleSpaceApi) => void }> = ({ onReady }) => {
  const space = useBubbleSpace();
  useEffect(() => onReady(space), [space, onReady]);
  return null;
};

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
  const spaceRef = useRef<BubbleSpaceApi | null>(null);

  /** 岸に着いているもの。海の泡ではないので、世界（WorldState）には居ない */
  const [docked, setDocked] = useState<readonly Docked[]>([]);
  /** 「いま離したらここに着く」の予告 */
  const [preview, setPreview] = useState<ScreenRect | null>(null);
  const vp = useMemo(() => ({ width: viewport.w, height: viewport.h }), [viewport]);

  /** 離したところが縁の近くなら、岸が横取りする */
  const takeOut = useCallback(
    (info: { id: string; url: string; rect: { x: number; y: number; w: number; h: number }; pointer: { x: number; y: number } }) => {
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const hit = resolveDock(
        { x: info.rect.x, y: info.rect.y, width: info.rect.w, height: info.rect.h },
        info.pointer,
        vp,
        others,
      );
      if (!hit) return false;
      setDocked((list) => [...list, { key: `${info.url}#${Date.now()}`, url: info.url, ...hit }]);
      return true;
    },
    [docked, vp],
  );

  /** ドラッグ中 ── 縁の近くなら、着いたあとの矩形を予告する */
  const previewTakeOut = useCallback(
    (info: { rect: { x: number; y: number; w: number; h: number }; pointer: { x: number; y: number } } | null) => {
      if (!info) { setPreview(null); return; }
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const hit = resolveDock(
        { x: info.rect.x, y: info.rect.y, width: info.rect.w, height: info.rect.h },
        info.pointer,
        vp,
        others,
      );
      setPreview(hit ? anchoredRect(hit.dock, hit.size, vp) : null);
    },
    [docked, vp],
  );

  const renderDockedContent = useCallback(
    (d: Docked) => {
      const r = renderRoute(routes, d.key, d.url);
      return r ? <r.route.Component bubble={r.bubble} /> : null;
    },
    [routes],
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(145deg, hsl(220, 35%, 18%) 0%, hsl(225, 40%, 22%) 40%, hsl(230, 35%, 20%) 100%)",
        borderRadius: `${TUBE_RADIUS}px`,
      }}
    >
      {/* 窓の中の旧スタックは、自分の岸の管を描かない ── 枠が二重になるので。
          岸は**窓の枠そのもの**（FrameShore）が引き受ける */}
      <style>{`.bl-body [data-showre-tubes]{display:none}
.bl-body [data-frame-shore] [data-showre-tubes]{display:block}`}</style>

      <BubbleSpace
        key={depth}
        routes={routes}
        initialUrls={INITIAL_URLS}
        viewport={viewport}
        depth={depth}
        onTakeOut={takeOut}
        onTakeOutPreview={previewTakeOut}
        style={{ position: "absolute", inset: 0 }}
      >
        <SpaceHandle onReady={(api) => { spaceRef.current = api; }} />
      </BubbleSpace>

      {/* 岸 ── 海の縁。バブルが貼り付く先であり、「ここが端だ」の目印でもある。
          海には重なるだけで、大きさは 1px も削らない */}
      <ShowreLayer
        viewport={vp}
        docked={docked}
        renderContent={renderDockedContent}
        preview={preview}
        onUpdate={(key, next) =>
          setDocked((list) => list.map((d) => (d.key === key ? { ...d, ...next } : d)))
        }
        onUndock={(key) => {
          const d = docked.find((x) => x.key === key);
          setDocked((list) => list.filter((x) => x.key !== key));
          if (d) spaceRef.current?.openBubble(d.url, null);
        }}
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
