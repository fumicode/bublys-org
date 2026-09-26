"use client";
/**
 * **海の器** ── 泡のならべかた（5 つの規則）の上に載せた、ひとつの海。
 *
 * 前はこれが OS のアプリの中（`apps/bublys-os/.../BubblesUINext.tsx`）に居た。
 * そのせいで**新しい海は OS でしか開けず**、同じ一覧（`ListSpace`）を持つバブリを
 * 単体で開くと、札を描く者がいなくて中身が潰れていた。
 *
 * > **海は器であって、家具ではない。** 何が開けるか（`routes`）と、
 * > 何が定位置に居るか（`homes`）は、使う側が持ち込む。
 *
 * ここが持つのは「海をひとつ立てる」ことだけ:
 *   - 並べ方・レンズの向きを覚え、見え方の口（`SpaceViewBubble`）に配る
 *   - 窓の大きさを測り、測り終えてから定位置を置く
 *   - レガシーのルートに橋を架け（`bridgeRoutes`）、岸つきの海（`ShoreSpace`）を敷く
 *
 * 決めた形 ── **Z を使わない**:
 *   - 重なりを作るのは並べ方。開いた泡は直前に開いたものの右下へずらして**重ねる**
 *   - 大きさは X の魚眼。焦点に近いほど大きい
 *   - 前後は「大きく写るものが手前」。触ると焦点が寄って入れ替わる（値は書かない）
 */
import { CSSProperties, FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PresetId } from "@bublys-org/bubble-layout";
import { type TubeJoin, type BubbleRoute as LegacyRoute } from "@bublys-org/bubbles-ui";
import { LayoutRoutesProvider, type BubbleSpaceApi } from "@bublys-org/bubble-layout-feature";
import { SEA_GROUND } from "./ShowreLayer.js";
import { ShoreSpace, type Home } from "./ShoreSpace.js";
import { bridgeRoutes } from "./legacyRouteBridge.js";
import { SpaceViewContext, type SpaceView } from "./SpaceViewContext.js";
import { ShoreLockProvider } from "./ShoreLock.js";

export type BubbleSeaProps = {
  /** この海で開けるもの。レガシーのルート定義を渡すと、中で橋を架ける */
  readonly routes: readonly LegacyRoute[];
  /** 定位置に居てほしいもの（岸に貼る泡）。家具は使う側が決める */
  readonly homes?: readonly Home[];
  /** 世界が空のときに最初に開く url */
  readonly initialUrls?: readonly string[];
  /**
   * **この海の世界線を、どの scope に記録するか。** 渡さなければ記録しない。
   * 記録するのは 3 つの節目だけ（`SeaWorldLine` の註）。
   */
  readonly worldLineScope?: string;
  /** 最初のレンズの向き。既定は X だけ魚眼（隣に開いたときに点くのがこれ） */
  readonly initialFisheye?: { x: boolean; y: boolean };
  /** 海の口を外から掴む（ツールバーなどが要るとき） */
  readonly onSpaceReady?: (api: BubbleSpaceApi) => void;
  readonly style?: CSSProperties;
  /**
   * 海と一緒に置いておきたいもの。**描かない部品**（集約を用意しておく hook など）を
   * 入れる想定で、泡ではない面を足すための口ではない。
   */
  readonly children?: ReactNode;
};

export const BubbleSea: FC<BubbleSeaProps> = ({
  routes: legacyRoutes,
  homes,
  initialUrls,
  worldLineScope,
  initialFisheye = { x: true, y: false },
  onSpaceReady,
  style,
  children,
}) => {
  /** 並べ方（View のプリセット）。開き方は 1 つしかないので、見え方が変わるのはここだけ */
  const [preset, setPresetState] = useState<PresetId>("free");
  /** 岸に着いた泡の所で、ネオンをどう通すか（見た目だけ。挙動は同じ）。既定は迂回 */
  const [join, setJoin] = useState<TubeJoin>("detour");
  /**
   * 魚眼をどちらの向きに掛けるか。**レンズは軸ごとに持つもの**なので、X と Y は別々に決まる
   * （両方掛けても、どちらも平行にしてもよい）。
   */
  const [fisheye, setFisheye] = useState(initialFisheye);
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const routes = useMemo(() => bridgeRoutes([...legacyRoutes]), [legacyRoutes]);
  /** 海の口（見え方の口から並べ方・レンズを触るのに要る。居なくなったことに気づく役は岸が持つ） */
  const spaceRef = useRef<BubbleSpaceApi | null>(null);
  const handleSpaceReady = useCallback(
    (api: BubbleSpaceApi) => {
      spaceRef.current = api;
      onSpaceReady?.(api);
    },
    [onSpaceReady],
  );

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
  /** 帯（どこから開いたか）をいつも見せるか。既定は触れたときだけ */
  const [bandsAlways, setBandsAlways] = useState(false);
  const onLens = useCallback((axis: "x" | "y", lens: string) => {
    setFisheye((f) => (f[axis] === (lens === "fisheye") ? f : { ...f, [axis]: lens === "fisheye" }));
  }, []);

  /** 見え方の口に渡す値（泡は海の中で描かれるので、文脈で渡す） */
  const setPreset = useCallback((next: PresetId) => {
    setPresetState(next);
    spaceRef.current?.setPreset(next);
  }, []);

  const spaceView = useMemo<SpaceView>(
    () => ({
      preset, setPreset, join, setJoin, fisheye, toggleFisheye,
      autoLens, setAutoLens, bandsAlways, setBandsAlways,
    }),
    [preset, setPreset, join, fisheye, toggleFisheye, autoLens, bandsAlways],
  );

  return (
    <SpaceViewContext.Provider value={spaceView}>
    {/* ロック（岸で海を埋めた形を、窓の大きさが変わっても保つ）。窓より上に置く
        ── 窓は岸に貼ると描き直されるので、中に持つと貼り直すたびに外れる */}
    <ShoreLockProvider>
    {/* ルート一覧は、どの泡からでも引けるように配る（一覧の空間が中の海を作るのに要る） */}
    <LayoutRoutesProvider routes={routes}>
    {/* 地と角の丸みは器（ShoreSpace）が持つ ── 岸に貼り付いたものを見て決まるので */}
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", ...style }}>
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
        initialUrls={initialUrls}
        homes={homes}
        homesReady={homesReady}
        onSpaceReady={handleSpaceReady}
        /** 記録するのは岸つきの海の側 ── 姿には岸も入るので（`SeaWorldLine` の註） */
        worldLineScope={worldLineScope}
        autoLens={autoLens}
        bandDisplay={bandsAlways ? 'always' : 'hover'}
        onLens={onLens}
        style={{ position: "absolute", inset: 0 }}
      />
      {children}
    </div>
    </LayoutRoutesProvider>
    </ShoreLockProvider>
    </SpaceViewContext.Provider>
  );
};
