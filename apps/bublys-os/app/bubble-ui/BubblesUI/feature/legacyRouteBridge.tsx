"use client";
/**
 * 旧 `bubbles-ui` の画面を、新しい空間（泡のならべかた）の上でそのまま動かす橋。
 *
 * バブリの画面は**1文字も変えない**。渡すものは 3 つだけ:
 *   - 旧 `BubblesContext.openBubble` → 新しい空間の `openBubble`
 *   - 旧 `CurrentBubbleContext` → いま描いている泡の id
 *   - 旧 `KeyboardFocusContext` → いま触られている泡の id
 * 旧 `ObjectView` は前の 2 つを見てダブルクリックで開き、
 * 旧 `useKeyBindings` は残りの 1 つで「キーボードは誰のものか」を決める。
 *
 * ルートの形（pattern / type / Component）は新旧で同じに作られているので、
 * 包むのは中身だけで済む。
 */
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useBubbleSpace, useSelectedBubble } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, RoutedBubble } from "@bublys-org/bubble-layout-feature";
import {
  Bubble,
  BubblesContext,
  CurrentBubbleContext,
  KeyboardFocusContext,
  createBubble,
} from "@bublys-org/bubbles-ui";
import type { BubbleRoute as LegacyRoute } from "@bublys-org/bubbles-ui";
import { ShoreSpace } from "./ShoreSpace";
import { WINDOW_GROUND } from "./ShowreLayer";
import { useSpaceView } from "./SpaceViewContext";

/** 旧の画面 1 枚を、新しい空間の文脈に繋ぐ */
const LegacyScreen: FC<{ bubble: RoutedBubble; Legacy: FC<{ bubble: never }>; children?: ReactNode }> = ({
  bubble,
  Legacy,
}) => {
  const space = useBubbleSpace();
  /**
   * ★ 旧の「キーボードはフォーカス中のバブルが受け取る」を繋ぐ。
   *   旧はこれを `bubbles` スライス（Redux）から読んでいたが、新しい海はそこへ書かない。
   *   繋がないと**どのバブルも一致せず、キー操作が一切効かない**
   *   （囲碁の世界線を ← → ↑ ↓ で辿れなくなっていたのがこれ）。
   */
  const selected = useSelectedBubble();
  const keyboardFocus = useMemo(() => ({ focusedId: selected }), [selected]);

  // 旧の画面は bubbles-ui の Bubble（クラス）を期待する。同じ url から作り、
  // id だけ新しい空間のものに揃える（「どの泡から開いたか」に使われる）
  const legacyBubble = useMemo(
    () => Bubble.fromJSON({ ...createBubble(bubble.url).toJSON(), id: bubble.id }),
    [bubble.id, bubble.url],
  );

  const legacyContext = useMemo(
    () => ({
      openBubble: (url: string, openerBubbleId?: string) => {
        space.openBubble(url, openerBubbleId ?? bubble.id);
      },
      surfaceLeftTop: { x: 0, y: 0 },
    }),
    [space, bubble.id],
  );

  return (
    <BubblesContext.Provider value={legacyContext as never}>
      <KeyboardFocusContext.Provider value={keyboardFocus}>
        <CurrentBubbleContext.Provider value={bubble.id}>
          <Legacy bubble={legacyBubble as never} />
        </CurrentBubbleContext.Provider>
      </KeyboardFocusContext.Provider>
    </BubblesContext.Provider>
  );
};

/**
 * 空間を持つ泡（窓）の中身 ── **大元の画面と同じ海**を、この泡の中に持たせる。
 *
 * 窓の中だけ別の動かし方をしていると、同じ泡なのに掴み方も並び方も違ってしまう。
 * 中も外と同じ 5 つの規則で動かす（`BubbleSpace` をそのまま入れ子にする）。
 * 窓は自分の世界を持つので、中の泡が外の海に出てくることはない。
 *
 * 枠（ステータスバーの下から下端まで）はそのまま岸。ユニバースという概念は新しい模型に
 * 無い ── あるのは「空間を持つ泡」だけなので、**その泡の枠そのものを岸として扱う**。
 * 中でもう 1 本ネオンを引くと枠が二重になるので、管はこの層だけが描く。
 */
const WindowSpace: FC<{ routes: () => LayoutRoute[]; seeds: readonly string[]; url: string }> = ({ routes, seeds, url }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /**
   * ★ **ネオンの通し方（迂回／枝分かれ）は、窓の岸にも同じものが効く。**
   *   見え方の口は 1 つしかないのに、窓の中だけ既定の「枝分かれ」に固定されていて、
   *   外の海と中の窓で管の通り方が食い違っていた。見ているのは同じ場所（`SpaceViewContext`）。
   */
  const { join } = useSpaceView();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ★ 大きさは **レイアウトの px**（offsetWidth）で測る。
    //   getBoundingClientRect は泡に掛かった transform:scale ごとの、**画面の px** を返す。
    //   中の海も管も泡の中＝倍率が掛かる前の座標に居るので、画面の px で測ると
    //   奥にある泡（scale<1）では中身がその倍率のぶん小さくなり、端まで届かない。
    //   測る座標と描く座標は同じでなければならない。
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      /**
       * ★ **0 は「大きさが 0」ではなく「いま測れない」。** 覚えない。
       *
       *   窓が隠れると（魚眼の端で描く下限を切った・岸へ貼り替えている最中）
       *   `offsetWidth` は 0 になる。それを覚えると下の `size.width > 0` が偽になり、
       *   **中の海ごとアンマウントされる** ── 海の世界は入れ子の `BubbleSpace` が
       *   React の状態で持っているので、そこに開いていたものが**丸ごと消える**。
       *   戻ってきても種（`initialUrls`）だけの空の海になる（実測で踏んだ：
       *   グループの窓を魚眼の端へ送って戻すと、中の一覧も札も消えていた）。
       *   隠れているあいだは**最後に測れた大きさのまま**でいる ── どうせ写っていない。
       */
      if (width === 0 || height === 0) return;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {size.width > 0 && (
        /**
         * ★ **枠そのものが岸。** 前はここでネオンを 1 本描くだけで、貼る機能は無かった
         *   ── 貼れる先が外の海にしか無かった。器（`ShoreSpace`）に差し替えて、
         *   外の海と同じ岸を窓の中にも持たせる。管もその岸が引く（枠が二重にならない）。
         * ★ 定位置（ランチャー・ポケット・見え方）は渡さない ── あれらは外の岸のもの。
         *   窓の岸は**空で始まり**、中の海から引き出したものだけが貼り付く。
         */
        <ShoreSpace
          routes={routes()}
          initialUrls={seeds}
          viewport={{ w: size.width, h: size.height }}
          ground={WINDOW_GROUND}
          join={join}
          // 岸に貼ると中身が描き直されるので、岸の中身は url で覚えておく
          persistKey={url}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
      )}
    </div>
  );
};

/**
 * 旧のルート 1 本を、新しい空間のルートにする。
 *
 * @param all 窓の中の海に渡すルート一覧。窓は自分の中でも同じ url を開けるので
 *   一覧が自分自身を含む ── 作り終わってから読めるよう関数で受ける
 */
const bridgeRoute = (route: LegacyRoute, all: () => LayoutRoute[]): LayoutRoute => {
  const Legacy = route.Component as FC<{ bubble: never }>;
  const size = route.bubbleOptions?.defaultSize;
  // 旧は「窓（universe / fillsContainer）」と「普通の中身」を区別していた。同じ区別を渡す
  // ── 窓は自分で背景を持つので、こちらで明るい地を敷くと中身が白く霞む
  const isWindow = !!(route.bubbleOptions?.universe || route.bubbleOptions?.fillsContainer);
  // 窓が開いたときに最初から居る泡（旧 `UniverseView.initialBubbleUrls` と同じ種）
  const seeds = route.initialBubbleUrls ?? [];
  return {
    pattern: route.pattern,
    type: route.type,
    Component: ({ bubble }) =>
      isWindow ? (
        <WindowSpace routes={all} seeds={seeds} url={bubble.url} />
      ) : (
        <LegacyScreen bubble={bubble} Legacy={Legacy} />
      ),
    /**
     * 中身が「地は自分で持つ」と言っていれば敷かない（空間がそのまま透ける）。
     *
     * ★ 見るのは **`contentBackground` があるかどうか** ── 値が何かではない。
     *   旧の世界では「その色で塗って」の意味だったが、新しい海では地を敷くかどうかしか
     *   無い。`'transparent'` だけを見ていたので、世界線（`rgba(15,18,28,0.3)`）のように
     *   **自分で色を決めていた泡が、いちばん明るい白地に落ちて**いた。
     *   色を指しているのは「まわりに任せない」という意思表示なので、敷かないほうへ寄せる。
     */
    ground: isWindow
      ? ('clear' as const)
      : route.bubbleOptions?.contentBackground
        ? ('none' as const)
        : ('light' as const),
    ...(size ? { size: { w: size.width, h: size.height } } : {}),
  };
};

/** 旧のルート一覧をまとめて。窓の中の海にも、同じ一覧をそのまま渡す */
export const bridgeRoutes = (routes: readonly LegacyRoute[]): LayoutRoute[] => {
  const bridged: LayoutRoute[] = [];
  const all = () => bridged;
  for (const route of routes) bridged.push(bridgeRoute(route, all));
  return bridged;
};
