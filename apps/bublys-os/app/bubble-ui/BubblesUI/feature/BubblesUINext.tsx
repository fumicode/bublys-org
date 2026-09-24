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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import type { PresetId } from "@bublys-org/bubble-layout";
import { type TubeJoin } from "@bublys-org/bubbles-ui";
import type { BubbleSpaceApi } from "@bublys-org/bubble-layout-feature";
import { bubbleRoutes } from "../domain/bubbleRoutes";
import { SEA_GROUND, type Docked } from "./ShowreLayer";
import { ShoreSpace, type Home } from "./ShoreSpace";
import { bridgeRoutes } from "./legacyRouteBridge";
import { SpaceViewContext, type SpaceView } from "./SpaceViewContext";
import { LayoutRoutesProvider } from "@bublys-org/bubble-layout-feature";
import { useEnsureMainLauncherEntity } from "@/app/launcher/useEnsureMainLauncher";

const LAUNCHER_URL = "launchers/main";
/** ランチャーの幅（アイコンだけ） */
const LAUNCHER_WIDTH = 60;

/**
 * ルール: **ランチャーは必ず居る。**
 * 最初は左の岸に、アイコンだけの幅で、端から端まで。
 * 海へ引き出して閉じてしまっても、**ここへ戻ってくる**（定位置）。
 */
const launcherDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${LAUNCHER_URL}#dock`,
  url: LAUNCHER_URL,
  // 左と上に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["left", "top"], at: { x: 0, y: 0 } },
  size: { width: LAUNCHER_WIDTH, height: viewport.height },
  ground: "light",
});


const POCKET_URL = "pocket";

/**
 * ポケットの定位置 ── **右下の岸に、アイコンだけの大きさで**。
 *
 * 旧の「画面の右下に常設した面」を、岸の上の**普通の泡**として置き直したもの
 * ── 専用の仕掛けは 1 つも要らない。広げたければ辺を掴んで引けばよいし、
 * 要らなければ引き剥がせば海へ返る。
 */
const pocketDock = (): Docked => ({
  key: `${POCKET_URL}#dock`,
  url: POCKET_URL,
  // 2 辺に着いているので、置き場所（at）は使われない（角に吸い付く）
  dock: { edges: ["bottom", "right"], at: { x: 0, y: 0 } },
  size: { width: 48, height: 48 },
  // 地は中身が持つ ── アイコンだけのときは海がそのまま透ける
  ground: "none",
});
const SPACE_VIEW_URL = "space-view";

const SPACE_VIEW_SIZE = { width: 480, height: 44 };

/**
 * 見え方の口の定位置 ── **上の縁の、横の中間**。
 *
 * ★ 中間は**サイドバーの幅を除いた残り**で測る。窓の真ん中で測ると、サイドバーのぶん
 *   左に寄って見える（岸として塞がっている所は、空いている所ではない）。
 * ★ 前はランチャーのすぐ右どなりに詰めて置いていたが、**上の縁の使いはじめを塞いで**いた。
 *   真ん中なら左右どちらにも余地が残る。
 * ★ 横の中心は**窓の幅から毎回出す**（定位置は viewport を受け取る）── 固定の数で持つと
 *   窓の大きさが変わったときに中間からずれる。
 */
const spaceViewDock = (viewport: { width: number; height: number }): Docked => ({
  key: `${SPACE_VIEW_URL}#dock`,
  url: SPACE_VIEW_URL,
  dock: {
    edges: ["top"],
    at: {
      x: Math.round(LAUNCHER_WIDTH + (viewport.width - LAUNCHER_WIDTH - SPACE_VIEW_SIZE.width) / 2),
      y: 0,
    },
  },
  size: SPACE_VIEW_SIZE,
  // 地は敷かない ── ボタンが空間の上に浮いて見える
  ground: "none",
});

/**
 * **定位置に居てほしいもの。** 居なくなったら、ここへ戻ってくる。
 * 岸に貼ってある間は閉じる口が無いので、消えるのは海へ出して閉じたときだけ。
 */
const HOMES: readonly Home[] = [
  launcherDock,
  spaceViewDock,
  pocketDock,
];

export const BubblesUINext = () => {
  /** 並べ方（View のプリセット）。開き方は 1 つしかないので、見え方が変わるのはここだけ */
  const [preset, setPresetState] = useState<PresetId>("free");
  /** 岸に着いた泡の所で、ネオンをどう通すか（見た目だけ。挙動は同じ）。既定は迂回 */
  const [join, setJoin] = useState<TubeJoin>("detour");
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
  /** 海の口（見え方の口から並べ方・レンズを触るのに要る。居なくなったことに気づく役は岸が持つ） */
  const spaceRef = useRef<BubbleSpaceApi | null>(null);
  const onSpaceReady = useCallback((api: BubbleSpaceApi) => { spaceRef.current = api; }, []);

  /**
   * 定位置を置いてよいか ── **画面の大きさを測り終えてから**。
   * 測る前の仮の値で置くと、端から端までのはずのものが中途半端な丈になる。
   */
  const homesReady =
    typeof window !== "undefined" &&
    viewport.w === window.innerWidth &&
    viewport.h === window.innerHeight;

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

  /**
   * レンズをまかせるか。まかせているあいだ、軸ごとのレンズは海が自分で決める
   * ── 口の見た目（魚眼X/Y が点いているか）は、決まった結果を受け取って合わせる。
   */
  const [autoLens, setAutoLens] = useState(false);
  const onLens = useCallback((axis: "x" | "y", lens: string) => {
    setFisheye((f) => (f[axis] === (lens === "fisheye") ? f : { ...f, [axis]: lens === "fisheye" }));
  }, []);

  /** 見え方の口に渡す値（泡は海の中で描かれるので、文脈で渡す） */
  const setPreset = useCallback((next: PresetId) => {
    setPresetState(next);
    spaceRef.current?.setPreset(next);
  }, []);

  const spaceView = useMemo<SpaceView>(
    () => ({ preset, setPreset, join, setJoin, fisheye, toggleFisheye, autoLens, setAutoLens }),
    [preset, setPreset, join, fisheye, toggleFisheye, autoLens],
  );

  return (
    <SpaceViewContext.Provider value={spaceView}>
    {/* ルート一覧は、どの泡からでも引けるように配る（一覧の空間が中の海を作るのに要る） */}
    <LayoutRoutesProvider routes={routes}>
    {/* 地と角の丸みは器（ShoreSpace）が持つ ── 岸に貼り付いたものを見て決まるので */}
    <Box sx={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative" }}>
      {/* 管は**1 つの枠に 1 本**。窓の中にもう 1 本引かれるところを消す
          （その窓の枠は中の器＝ShoreSpace が引き受ける）。
          ★ 「岸に着いた窓」の重なりは**ここでは消さない** ── CSS で消すと
            その窓が持っている**中の岸の管まで一緒に消える**（岸に貼ったものは
            バブルの装いを持たないので、戻す側の `.bl-body` が無い）。
            消すのは枠 1 本だけなので、器の `frame` で分けている。 */}
      <style>{`.bl-body [data-showre-tubes]{display:none}
.bl-body [data-frame-shore] [data-showre-tubes]{display:block}`}</style>

      <ShoreSpace
        routes={routes}
        viewport={viewport}
        ground={SEA_GROUND}
        join={join}
        homes={HOMES}
        homesReady={homesReady}
        onSpaceReady={onSpaceReady}
        autoLens={autoLens}
        onLens={onLens}
        style={{ position: "absolute", inset: 0 }}
      />

    </Box>
    </LayoutRoutesProvider>
    </SpaceViewContext.Provider>
  );
};
