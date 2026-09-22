"use client";
import { FC, ReactNode, memo, useCallback, useMemo } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { Layer } from "@bublys-org/bubbles-ui-util";
import { nameIntent } from "@bublys-org/world-line-graph";
import type { Bubble } from "../Bubble.domain.js";
import {
  deleteProcessBubble,
  makeSelectFocusedBubbleId,
  makeSelectShowreBubbles,
  removeBubble,
  updateBubble,
} from "../state/bubbles-slice.js";
import { ShowreSide, isVerticalShowre } from "./Showre.domain.js";
import { ShowreContext } from "./ShowreContext.js";
import { UniverseContext } from "../context/UniverseContext.js";
import { useHoveredBubble } from "../context/HoveredBubbleContext.js";
import { ConnectedBubbleView } from "../ui/BubblesLayeredView.js";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export type ShowreViewProps = {
  universeId: string;
  side: ShowreSide;
  /** バブル中身のレンダラ（UniverseView と同じものを渡す） */
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
  /** この universe の海の要素（岸に着いたバブルの矩形を、海の座標で測るため） */
  seaRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * 1 つの岸（辺）。そこに着いているバブルを順に並べる。
 *
 * 岸に着いたバブルは**海に居るときと同じバブル**（ConnectedBubbleView）で描く。
 * 専用のビューは作らない。違いは置き方だけ: 海では position に absolute で置くが、
 * 岸では辺に沿った並び（flex）に relative で収まる。大きさは窓だったときのまま
 * （size があればそれ、無ければ中身なり）なので、辺の長さいっぱいは取らない。
 * 同じ辺に何個でも並ぶ。
 *
 * 左右の岸は縦に、上下の岸は横に並ぶ。誰も着いていなければ何も描かない。
 */
export const ShowreView: FC<ShowreViewProps> = memo(({ universeId, side, renderBubbleContent, seaRef }) => {
  const dispatch = useAppDispatch();
  const showreBubbles = useAppSelector(makeSelectShowreBubbles(universeId));
  const focusedBubbleId = useAppSelector(makeSelectFocusedBubbleId(universeId));
  const hovered = useHoveredBubble();
  const bubbles = showreBubbles[side];

  // 岸のバブルは universe の海の外に居るが、矩形の計測（renderedRect）は海の座標で行う。
  // UniverseContext を海の要素に向けて張り直す
  const universeRef = useMemo(
    () => ({
      get current() {
        return seaRef.current?.querySelector<HTMLDivElement>("[data-bubble-universe]") ?? null;
      },
    }),
    [seaRef],
  );
  const universeContextValue = useMemo(() => ({ universeId, universeRef }), [universeId, universeRef]);

  // 岸では position を使わないので、面の変換は恒等でよい
  const surfaceLayer = useMemo(() => new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }), []);
  const vanishingPoint = useMemo(() => ({ x: 0, y: 0 }), []);
  const renderContent = useCallback((b: Bubble) => renderBubbleContent?.(b) ?? null, [renderBubbleContent]);

  const handleHoverChange = useCallback(
    (bubbleId: string, isHovered: boolean) => {
      if (isHovered) hovered?.enterBubble(bubbleId);
      else hovered?.leaveBubble(bubbleId);
    },
    [hovered],
  );
  const handleClose = useCallback(
    (b: Bubble) => {
      nameIntent(`close:${b.type}`);
      dispatch(deleteProcessBubble(b.id, universeId));
      dispatch(removeBubble(b.id, universeId));
    },
    [dispatch, universeId],
  );
  const handleResize = useCallback(
    (b: Bubble) => dispatch(updateBubble(b.toJSON(), universeId)),
    [dispatch, universeId],
  );

  if (bubbles.length === 0) return null;

  return (
    <ShowreContext.Provider value={{ side, universeId }}>
      <UniverseContext.Provider value={universeContextValue}>
        <Bar data-showre-side={side} $vertical={isVerticalShowre(side)}>
          {bubbles.map((bubble) => (
            // data-docked-bubble-id: 帯の要素として矩形を測る・並び順を数えるための目印
            <Slot key={bubble.id} data-docked-bubble-id={bubble.id}>
              <ConnectedBubbleView
                universeId={universeId}
                bubbleId={bubble.id}
                layerIndex={0}
                zIndex={1}
                isFocused={focusedBubbleId === bubble.id}
                vanishingPoint={vanishingPoint}
                surfaceLayer={surfaceLayer}
                docked
                onHoverChange={handleHoverChange}
                renderBubbleContent={renderContent}
                onBubbleClose={handleClose}
                onBubbleResize={handleResize}
              />
            </Slot>
          ))}
        </Bar>
      </UniverseContext.Provider>
    </ShowreContext.Provider>
  );
});
ShowreView.displayName = "ShowreView";

const Bar = styled.div<DivProps & { $vertical: boolean }>`
  /* 入れ子 universe の中身は pointer-events: none（クリック貫通）を継承する。
     岸そのものは素通しでよく、バブルは自分で auto を明示している */
  pointer-events: none;
  display: flex;
  flex-direction: ${(p) => (p.$vertical ? "column" : "row")};
  align-items: flex-start;
  flex-shrink: 0;
  ${(p) => (p.$vertical ? "height: 100%;" : "width: 100%;")}
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

const Slot = styled.div<DivProps>`
  position: relative;
  flex: 0 0 auto;
  max-width: 100%;
  max-height: 100%;
`;
