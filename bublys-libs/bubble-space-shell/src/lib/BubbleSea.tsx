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
import type { LayoutRules, PresetId } from "@bublys-org/bubble-layout";
import { type TubeJoin, type BubbleRoute as LegacyRoute } from "@bublys-org/bubbles-ui";
import { LayoutRoutesProvider, type BubbleSpaceApi } from "@bublys-org/bubble-layout-feature";
import { SEA_GROUND } from "./ShowreLayer.js";
import { ShoreSpace, type Home } from "./ShoreSpace.js";
import { bridgeRoutes } from "./legacyRouteBridge.js";
import { SpaceViewContext } from "./SpaceViewContext.js";
import { useSpaceViewState } from "./useSpaceViewState.js";
import { ShoreLockProvider } from "./ShoreLock.js";

/** 最初の並べ方。口の最初の見た目（どの軸が魚眼か）もここから出す */
const INITIAL_PRESET: PresetId = "free";

export type BubbleSeaProps = {
  /** この海で開けるもの。レガシーのルート定義を渡すと、中で橋を架ける */
  readonly routes: readonly LegacyRoute[];
  /**
   * **測る相手**（CSS px）。渡さなければ窓そのもの（`window.innerWidth/Height`）。
   *
   * ★ 端末ごとの収まりを見るための口（`app/shore-fit`）。海は窓を測って定位置を置くので、
   *   小さい枠に入れただけでは「窓ぜんぶある」と思ってしまう。渡したときは**測り終えた**
   *   とみなす ── 窓でないものの大きさを窓と比べても、永遠に一致しない。
   */
  readonly viewport?: { readonly w: number; readonly h: number };
  /** 定位置に居てほしいもの（岸に貼る泡）。家具は使う側が決める */
  readonly homes?: readonly Home[];
  /** 世界が空のときに最初に開く url */
  readonly initialUrls?: readonly string[];
  /**
   * **この海の世界線を、どの scope に記録するか。** 渡さなければ記録しない。
   * 記録するのは 3 つの節目だけ（`SeaWorldLine` の註）。
   */
  readonly worldLineScope?: string;
  /**
   * **世界線に入らないもの**（url）。
   *
   * > 世界線を映すものは、世界線に入らない。
   *
   * 渡したものは海の姿からも岸からも抜いて記録され、節へ移っても消えない
   * （`SeaWorldLine` の `WorldLineOutside`）。渡さなければ、ぜんぶ入る。
   */
  readonly worldLineOutside?: readonly string[];
  /**
   * **規則が決めていない所の選び方**（`LayoutRules`）。渡さなければ既定 ＝ 今までと同じ答え。
   *
   * ★ 効くのは**この海だけ**。窓の中の海も一覧も別の `BubbleSpace` なので、ここで選んだことは
   *   伝わらない ── 「大元の海だけ、両軸が魚眼のときの大きさを斜辺でまとめる」のように、
   *   名指しした海にだけ渡す（`sizeCombine`。`rules.ts` の註）。
   */
  readonly rules?: Partial<LayoutRules>;
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
  viewport: given,
  homes,
  initialUrls,
  worldLineScope,
  worldLineOutside,
  rules,
  onSpaceReady,
  style,
  children,
}) => {
  /** 岸に着いた泡の所で、ネオンをどう通すか（見た目だけ。挙動は同じ）。既定は迂回 */
  const [join, setJoin] = useState<TubeJoin>("detour");
  const [measured, setMeasured] = useState({ w: 1280, h: 720 });
  /** 外から渡されていれば、そちらが正 ── 窓は測らない */
  const viewport = given ?? measured;

  useEffect(() => {
    if (given) return;
    const measure = () => setMeasured({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [given]);

  const routes = useMemo(() => bridgeRoutes([...legacyRoutes]), [legacyRoutes]);
  /** 海の口（見え方の口から並べ方・レンズを触るのに要る。居なくなったことに気づく役は岸が持つ） */
  const spaceRef = useRef<BubbleSpaceApi | null>(null);
  const handleSpaceReady = useCallback(
    (api: BubbleSpaceApi) => {
      spaceRef.current = api;
      setReady(api);
      onSpaceReady?.(api);
    },
    [onSpaceReady],
  );
  /** 口が変わったことを描き直しに伝えるだけ（触るのは `spaceRef`） */
  const [, setReady] = useState<BubbleSpaceApi | null>(null);

  /**
   * ★ **見え方の持ち方は、窓の中の海と同じ見本**（`useSpaceViewState`）。
   *   口の最初の見た目も、海が報せてくるレンズも、そこで面倒を見る。
   */
  const { view: spaceView, onLens, autoLens, bandDisplay } = useSpaceViewState(
    spaceRef, join, setJoin, INITIAL_PRESET,
  );

  /**
   * 定位置を置いてよいか ── **画面の大きさを測り終えてから**。
   * 測る前の仮の値で置くと、端から端までのはずのものが中途半端な丈になる。
   */
  const homesReady =
    given != null ||
    (typeof window !== "undefined" &&
      measured.w === window.innerWidth &&
      measured.h === window.innerHeight);

  return (
    <SpaceViewContext.Provider value={spaceView}>
    {/* ロック（岸で海を埋めた形を、窓の大きさが変わっても保つ）。窓より上に置く
        ── 窓は岸に貼ると描き直されるので、中に持つと貼り直すたびに外れる */}
    <ShoreLockProvider>
    {/* ルート一覧は、どの泡からでも引けるように配る（一覧の空間が中の海を作るのに要る） */}
    <LayoutRoutesProvider routes={routes}>
    {/* 地と角の丸みは器（ShoreSpace）が持つ ── 岸に貼り付いたものを見て決まるので */}
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        ...style,
        /**
         * ★ **器の大きさと岸の座標は、同じ 1 つの数から出す。**
         *   岸は `window.innerHeight` で置き場所を決めるので、器がそれと違う高さだと
         *   下の縁に貼ったものが画面の外へずれる（スマホの `100vh` がまさにそれ）。
         *   測り終えていれば、その数でそのまま留める ── 測る前は渡された CSS のまま
         *   （`100dvh` など）なので、ちらつかない。
         */
        ...(given || !homesReady ? {} : { width: measured.w, height: measured.h }),
      }}
    >
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
        worldLineOutside={worldLineOutside}
        autoLens={autoLens}
        rules={rules}
        bandDisplay={bandDisplay}
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
