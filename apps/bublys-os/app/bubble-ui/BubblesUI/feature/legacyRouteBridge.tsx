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
import { FC, ReactNode, useMemo } from "react";
import { useBubbleSpace } from "@bublys-org/bubble-layout-feature";
import type { BubbleRoute as LayoutRoute, RoutedBubble } from "@bublys-org/bubble-layout-feature";
import { Bubble, BubblesContext, CurrentBubbleContext, createBubble } from "@bublys-org/bubbles-ui";
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

/** 旧のルート 1 本を、新しい空間のルートにする */
export const bridgeRoute = (route: LegacyRoute): LayoutRoute => {
  const Legacy = route.Component as FC<{ bubble: never }>;
  const size = route.bubbleOptions?.defaultSize;
  // 旧は「窓（universe / fillsContainer）」と「普通の中身」を区別していた。同じ区別を渡す
  // ── 窓は自分で背景を持つので、こちらで明るい地を敷くと中身が白く霞む
  const isWindow = !!(route.bubbleOptions?.universe || route.bubbleOptions?.fillsContainer);
  return {
    pattern: route.pattern,
    type: route.type,
    Component: ({ bubble }) => <LegacyScreen bubble={bubble} Legacy={Legacy} />,
    ground: isWindow ? ('clear' as const) : ('light' as const),
    ...(size ? { size: { w: size.width, h: size.height } } : {}),
  };
};

/** 旧のルート一覧をまとめて */
export const bridgeRoutes = (routes: readonly LegacyRoute[]): LayoutRoute[] => routes.map(bridgeRoute);
