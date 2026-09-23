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
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { BubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { OpenDepth } from "@bublys-org/bubble-layout-feature";
import { TUBE_RADIUS, anchoredRect, type ScreenRect, type TubeJoin } from "@bublys-org/bubbles-ui";
import { BubbleSpaceContext, matchBubbleRoute, renderRoute, useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleSpaceApi, TakeOutInfo } from "@bublys-org/bubble-layout-feature";
import { bubbleRoutes } from "../domain/bubbleRoutes";
import { ShowreLayer, resolveDock, seaCornerRadius, type Docked } from "./ShowreLayer";
import { bridgeRoutes } from "./legacyRouteBridge";
import { FullscreenToggle } from "../../components/FullscreenToggle";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

/** 最初に開くもの。root には必ずランチャーが 1 つ居る */
const INITIAL_URLS = ["launchers/main"];

/** 上の口のボタン。押されているものだけ青く */
const chip = (active: boolean): CSSProperties => ({
  font: "13px/1.5 -apple-system, sans-serif",
  padding: "4px 12px",
  borderRadius: 7,
  cursor: "pointer",
  border: `1px solid ${active ? "#4d8dff" : "rgba(255,255,255,.18)"}`,
  background: active ? "rgba(77,141,255,.18)" : "rgba(255,255,255,.06)",
  color: "#dce8ff",
});

/** 海の口を外から掴むための小物（`BubbleSpace` の中でしか使えないので、子として置く） */
const SpaceHandle: FC<{ onReady: (api: BubbleSpaceApi) => void }> = ({ onReady }) => {
  const space = useBubbleSpace();
  useEffect(() => onReady(space), [space, onReady]);
  return null;
};

export const BubblesUINext = () => {
  const [depth, setDepth] = useState<OpenDepth>("cascade");
  /** 岸に着いた泡の所で、ネオンをどう通すか（見た目だけ。挙動は同じ） */
  const [join, setJoin] = useState<TubeJoin>("branch");
  /**
   * 魚眼をどちらの向きに掛けるか。**レンズは軸ごとに持つもの**なので、X と Y は別々に決まる
   * （両方掛けても、どちらも平行にしてもよい）。既定は X ── 隣に開いたときに点くのがこれ。
   */
  const [fisheye, setFisheye] = useState({ x: true, y: false });
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

  /**
   * 離したところが縁の近くなら、岸が横取りする。
   *
   * ★ 貼る大きさは **泡が自分で持っている大きさ**（`info.size`）。写っている大きさではない。
   *   魚眼の掛かった向きでは縁へ寄るほど像が潰れるので、写った大きさで貼ると
   *   端に飲み込まれた薄い帯になる。どの辺に着くかはカーソルだけが決める。
   */
  const takeOut = useCallback(
    (info: TakeOutInfo) => {
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const hit = resolveDock(
        { x: info.rect.x, y: info.rect.y, width: info.size.w, height: info.size.h },
        info.pointer,
        vp,
        others,
      );
      if (!hit) return false;
      // 地は海に浮いているときと同じもの（窓は自分の夜空を持っている）
      const ground = matchBubbleRoute(routes, info.url)?.ground ?? "light";
      setDocked((list) => [...list, { key: `${info.url}#${Date.now()}`, url: info.url, ground, ...hit }]);
      return true;
    },
    [docked, vp, routes],
  );

  /** ドラッグ中 ── 縁の近くなら、着いたあとの矩形を予告する（大きさは貼るときと同じ規則） */
  const previewTakeOut = useCallback(
    (info: TakeOutInfo | null) => {
      if (!info) { setPreview(null); return; }
      const others = docked.map((d) => anchoredRect(d.dock, d.size, vp));
      const hit = resolveDock(
        { x: info.rect.x, y: info.rect.y, width: info.size.w, height: info.size.h },
        info.pointer,
        vp,
        others,
      );
      setPreview(hit ? anchoredRect(hit.dock, hit.size, vp) : null);
    },
    [docked, vp],
  );

  /**
   * 岸に着いた泡から海を開く口。
   *
   * 岸は `BubbleSpace` の**外**にある層なので、そのままでは開く口（Context）が届かない
   * ── これが「ランチャーから何も開かない」の正体だった。ここで繋ぎ直す。
   * ただし**開く元（opener）は渡さない** ── 岸の泡は海の泡ではないので、
   * 隣に開きようがない。開いた泡は海の新入りとして置かれる。
   */
  const shoreSpace = useMemo<BubbleSpaceApi>(
    () => ({
      openBubble: (url) => spaceRef.current?.openBubble(url, null) ?? "",
      closeBubble: (id) => spaceRef.current?.closeBubble(id),
      urlOf: (id) => spaceRef.current?.urlOf(id) ?? null,
      canOpen: (url) => spaceRef.current?.canOpen(url) ?? false,
      setLens: (axis, lens) => spaceRef.current?.setLens(axis, lens),
      takeIn: (url, rect) => spaceRef.current?.takeIn(url, rect) ?? "",
    }),
    [],
  );

  /**
   * 軸のレンズを切り替える。世界に書くのは View の 1 つの軸だけ。
   * ★ `setFisheye` の更新関数の中で海に書いてはいけない ──
   *   更新関数はレンダリング中に呼ばれるので、別のコンポーネントを更新することになる。
   */
  const toggleFisheye = useCallback(
    (axis: "x" | "y") => {
      const on = !fisheye[axis];
      setFisheye((f) => ({ ...f, [axis]: on }));
      spaceRef.current?.setLens(axis, on ? "fisheye" : "parallel");
    },
    [fisheye],
  );

  const renderDockedContent = useCallback(
    (d: Docked) => {
      const r = renderRoute(routes, d.key, d.url);
      if (!r) return null;
      return (
        <BubbleSpaceContext.Provider value={shoreSpace}>
          <r.route.Component bubble={r.bubble} />
        </BubbleSpaceContext.Provider>
      );
    },
    [routes, shoreSpace],
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(145deg, hsl(220, 35%, 18%) 0%, hsl(225, 40%, 22%) 40%, hsl(230, 35%, 20%) 100%)",
        // 角に貼り付いた泡が居る角だけ、丸みを外す（中身が角丸に削られないように）
        ...seaCornerRadius(docked, vp, join, TUBE_RADIUS),
      }}
    >
      {/* 管は**1 つの枠に 1 本**。二重になるところを 2 つ消してある:
            ・窓の中にもう 1 本（その窓の枠は FrameShore が引き受ける）
            ・岸に着いた窓の中にもう 1 本（そちらは岸の管が引き受ける）
          どちらも「中に入れ子の窓が居るなら、その窓の枠は描く」を後の行で戻している */}
      <style>{`.bl-body [data-showre-tubes]{display:none}
.bl-body [data-frame-shore] [data-showre-tubes]{display:block}
[data-docked-url] [data-frame-shore] [data-showre-tubes]{display:none}
[data-docked-url] .bl-body [data-frame-shore] [data-showre-tubes]{display:block}`}</style>

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
        join={join}
        onUpdate={(key, next) =>
          setDocked((list) => list.map((d) => (d.key === key ? { ...d, ...next } : d)))
        }
        onUndock={(key, rect) => {
          const d = docked.find((x) => x.key === key);
          setDocked((list) => list.filter((x) => x.key !== key));
          // 剥がした所にそのまま浮かべる（岸へ貼るときと同じで、見えている矩形が正）
          if (d) spaceRef.current?.takeIn(d.url, { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
        }}
      />

      {/* 開き方を見比べる口。決めた既定は「重ねて開く」 */}
      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 1000, display: "flex", gap: 1, alignItems: "center" }}>
        {(["cascade", "fisheye-x", "plane"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            style={chip(depth === d)}
          >
            {d === "cascade" ? "重ねて開く" : d === "fisheye-x" ? "隣に開く" : "面"}
          </button>
        ))}
        {/* ネオンの通し方。枝分かれ（T 字）か、泡の枠へ迂回するか */}
        <button
          onClick={() => setJoin((j) => (j === "branch" ? "detour" : "branch"))}
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
    </Box>
  );
};
