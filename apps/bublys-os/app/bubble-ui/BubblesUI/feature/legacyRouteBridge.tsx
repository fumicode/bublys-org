"use client";
/**
 * 旧 `bubbles-ui` の画面を、新しい空間（泡のならべかた）の上でそのまま動かす橋。
 *
 * バブリの画面は**1文字も変えない**。渡すものは 2 つだけ:
 *   - 旧 `BubblesContext.openBubble` → 新しい空間の `openBubble`
 *   - 旧 `CurrentBubbleContext` → いま描いている泡の id
 * 旧 `ObjectView` はこの 2 つを見てダブルクリックで開くので、これで繋がる。
 *
 * ルートの形（pattern / type / Component）は新旧で同じに作られているので、
 * 包むのは中身だけで済む。
 */
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BubbleSpace, useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, RoutedBubble } from "@bublys-org/bubble-layout-feature";
import { Bubble, BubblesContext, CurrentBubbleContext, ShowreTubes, createBubble } from "@bublys-org/bubbles-ui";
import type { BubbleRoute as LegacyRoute } from "@bublys-org/bubbles-ui";

/** 旧の画面 1 枚を、新しい空間の文脈に繋ぐ */
const LegacyScreen: FC<{ bubble: RoutedBubble; Legacy: FC<{ bubble: never }>; children?: ReactNode }> = ({
  bubble,
  Legacy,
}) => {
  const space = useBubbleSpace();

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
      <CurrentBubbleContext.Provider value={bubble.id}>
        <Legacy bubble={legacyBubble as never} />
      </CurrentBubbleContext.Provider>
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
const WindowSpace: FC<{ routes: () => LayoutRoute[]; seeds: readonly string[] }> = ({ routes, seeds }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
        <>
          <BubbleSpace
            routes={routes()}
            initialUrls={seeds}
            viewport={{ w: size.width, h: size.height }}
            depth="cascade"
            style={{ position: "absolute", left: 0, top: 0 }}
          />
          <div data-frame-shore="" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <ShowreTubes viewport={size} outlines={[{ rect: { x: 0, y: 0, width: size.width, height: size.height } }]} />
          </div>
        </>
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
        <WindowSpace routes={all} seeds={seeds} />
      ) : (
        <LegacyScreen bubble={bubble} Legacy={Legacy} />
      ),
    // 中身が「地は自分で持つ」と言っていれば敷かない（空間がそのまま透ける）
    ground: isWindow
      ? ('clear' as const)
      : route.bubbleOptions?.contentBackground === 'transparent'
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
