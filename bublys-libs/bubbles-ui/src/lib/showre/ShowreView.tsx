"use client";
import { FC, ReactNode, memo } from "react";
import styled from "styled-components";
import { useAppSelector } from "@bublys-org/state-management";
import type { Bubble } from "../Bubble.domain.js";
import { makeSelectShowreBubbles } from "../state/bubbles-slice.js";
import { ShowreSide, isVerticalShowre } from "./Showre.domain.js";
import { ShowreContext } from "./ShowreContext.js";
import { DockedBubbleView } from "./DockedBubbleView.js";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export type ShowreViewProps = {
  universeId: string;
  side: ShowreSide;
  /** バブル中身のレンダラ（UniverseView と同じものを渡す） */
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
};

/**
 * 1 つの岸（辺）。そこに着いているバブルを順に並べて帯にする。
 * 誰も着いていなければ何も描かない（幅 0）。
 *
 * 左右の岸は縦に、上下の岸は横に並ぶ。帯の太さは中身に任せる
 * （中身が自分の岸を {@link useShowreSide} で知って決める）。
 */
export const ShowreView: FC<ShowreViewProps> = memo(({ universeId, side, renderBubbleContent }) => {
  const showreBubbles = useAppSelector(makeSelectShowreBubbles(universeId));
  const bubbles = showreBubbles[side];
  if (bubbles.length === 0) return null;

  return (
    <ShowreContext.Provider value={{ side, universeId }}>
      <Bar data-showre-side={side} $vertical={isVerticalShowre(side)} $side={side}>
        {bubbles.map((bubble) => (
          <DockedBubbleView key={bubble.id} bubble={bubble} side={side}>
            {renderBubbleContent?.(bubble)}
          </DockedBubbleView>
        ))}
      </Bar>
    </ShowreContext.Provider>
  );
});
ShowreView.displayName = "ShowreView";

// 帯とユニバース（海）の境目の線。辺ごとに海に面した側へ引く
const borderTowardSea: Record<ShowreSide, string> = {
  left: "border-right",
  right: "border-left",
  top: "border-bottom",
  bottom: "border-top",
};

const Bar = styled.div<DivProps & { $vertical: boolean; $side: ShowreSide }>`
  /* 入れ子 universe の中身は pointer-events: none（クリック貫通）を継承するので、
     帯は自分で auto を明示する。そうしないとつまみも中身も掴めない。 */
  pointer-events: auto;
  display: flex;
  flex-direction: ${(p) => (p.$vertical ? "column" : "row")};
  align-items: stretch;
  flex-shrink: 0;
  ${(p) => (p.$vertical ? "height: 100%;" : "width: 100%;")}
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: rgba(245, 245, 245, 0.95);
  ${(p) => borderTowardSea[p.$side]}: 1px solid rgba(0, 0, 0, 0.1);
`;
