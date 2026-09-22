"use client";
import { FC, ReactNode, memo } from "react";
import styled from "styled-components";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { Bubble } from "../Bubble.domain.js";
import { ShowreSide, isVerticalShowre } from "./Showre.domain.js";
import { useShowreGripDrag } from "./useShowreGripDrag.js";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export type DockedBubbleViewProps = {
  bubble: Bubble;
  side: ShowreSide;
  children?: ReactNode;
};

/**
 * 岸に着いたバブルの薄いクローム。枠・影・リサイズは持たず、つまみと中身だけ。
 * 中身は浮いているときと同じコンポーネント（{@link ShowreView} が renderBubbleContent で渡す）。
 *
 * つまみは辺の並びの先頭側（縦なら上、横なら左）。
 * つまみを掴んで辺の近くで離せば辺の移動・並び替え、海の中で離せば引き剥がし
 * （{@link useShowreGripDrag}）。
 *
 * 中身との間合い: つまみは自分の帯（{@link DOCKED_GRIP_SIZE}）を持ち、境界線で中身と
 * 区切る。中身側にはつまみから {@link DOCKED_CONTENT_GAP} の余白を取る。浮いている
 * ときはバブルの枠が余白を担っていたが、帯にはその枠が無いので、ここで担う。
 * 中身が absolute で広がる種類（canvas 等）でも、つまみは z-index で上に居る。
 */

/** つまみの帯の太さ（px） */
export const DOCKED_GRIP_SIZE = 24;
/** つまみと中身の間の余白（px） */
export const DOCKED_CONTENT_GAP = 8;
/** 中身と帯の縁（つまみと反対側・辺に沿う側）の余白（px） */
export const DOCKED_EDGE_GAP = 4;
export const DockedBubbleView: FC<DockedBubbleViewProps> = memo(({ bubble, side, children }) => {
  const vertical = isVerticalShowre(side);
  const { isDragging, gripProps } = useShowreGripDrag(bubble);
  return (
    <Docked data-docked-bubble-id={bubble.id} $vertical={vertical}>
      <Grip $vertical={vertical} $dragging={isDragging} title="つまみ（ドラッグで辺の移動 / 海へ引き剥がし）" {...gripProps}>
        <DragIndicatorIcon sx={{ fontSize: 16, transform: vertical ? "rotate(90deg)" : "none" }} />
      </Grip>
      <Content $vertical={vertical}>{children}</Content>
    </Docked>
  );
});
DockedBubbleView.displayName = "DockedBubbleView";

const Docked = styled.div<DivProps & { $vertical: boolean }>`
  position: relative;
  display: flex;
  flex-direction: ${(p) => (p.$vertical ? "column" : "row")};
  align-items: stretch;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  /* 同じ岸に並ぶ帯どうしの区切り */
  & + & {
    ${(p) => (p.$vertical ? "border-top" : "border-left")}: 1px solid rgba(0, 0, 0, 0.1);
  }
`;

const Grip = styled.div<DivProps & { $vertical: boolean; $dragging: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  ${(p) =>
    p.$vertical
      ? `height: ${DOCKED_GRIP_SIZE}px; width: 100%; border-bottom: 1px solid rgba(0, 0, 0, 0.08);`
      : `width: ${DOCKED_GRIP_SIZE}px; height: 100%; border-right: 1px solid rgba(0, 0, 0, 0.08);`}
  cursor: ${(p) => (p.$dragging ? "grabbing" : "grab")};
  touch-action: none;
  user-select: none;
  color: rgba(0, 0, 0, 0.35);
  background-color: ${(p) => (p.$dragging ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.03)")};
  &:hover {
    color: rgba(0, 0, 0, 0.65);
    background-color: rgba(0, 0, 0, 0.06);
  }
`;

const Content = styled.div<DivProps & { $vertical: boolean }>`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  /* つまみ側に GAP、辺に沿う側に EDGE_GAP */
  padding: ${(p) =>
    p.$vertical
      ? `${DOCKED_CONTENT_GAP}px ${DOCKED_EDGE_GAP}px ${DOCKED_EDGE_GAP}px`
      : `${DOCKED_EDGE_GAP}px ${DOCKED_EDGE_GAP}px ${DOCKED_EDGE_GAP}px ${DOCKED_CONTENT_GAP}px`};
  box-sizing: border-box;
`;
