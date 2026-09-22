"use client";
import { FC, ReactNode, memo, useCallback, useMemo } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { Layer } from "@bublys-org/bubbles-ui-util";
import { nameIntent } from "@bublys-org/world-line-graph";
import type { Bubble } from "../Bubble.domain.js";
import {
  deleteProcessBubble,
  makeSelectDockedBubbles,
  makeSelectFocusedBubbleId,
  removeBubble,
  updateBubble,
} from "../state/bubbles-slice.js";
import { anchoredRect, slotStyle, touchingEdges } from "./Showre.domain.js";
import { ShowreContext } from "./ShowreContext.js";
import { ShowreTubes, type ShowreTubeOutline } from "./ShowreTubes.js";
import { TUBE_THICKNESS } from "./tube.js";
import { useHoveredBubble } from "../context/HoveredBubbleContext.js";
import { ConnectedBubbleView } from "../ui/BubblesLayeredView.js";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export type ShowreOverlayProps = {
  universeId: string;
  /** 海の大きさ（＝この universe の見えている範囲）。貼り付く位置はこれを基準にする */
  viewport: { width: number; height: number };
  /** バブル中身のレンダラ（海と同じものを渡す） */
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
  /** ドラッグ中の予告（離したあとの矩形）。岸でも海でも同じに描く。無ければ出さない */
  preview?: { rect: { x: number; y: number; width: number; height: number } } | null;
};

/**
 * 岸に貼り付いたバブルを描く層。
 *
 * ★ 岸は「海の外の別のエリア」ではない。海（スクロールする面）に**重なる**層で、
 *   海の大きさは 1px も削らない。だからスクロールバーも位置がずれないし、
 *   貼り付いたバブルは海をスクロールしても画面から動かない。
 *
 * 描くのは海に浮いているのと**同じバブル**（{@link ConnectedBubbleView}）。
 * 違うのは置き場所だけ ── 海では universe 座標、ここでは画面の座標（貼った辺に合わせた矩形）。
 */
export const ShowreOverlay: FC<ShowreOverlayProps> = memo(
  ({ universeId, viewport, renderBubbleContent, preview }) => {
    const dispatch = useAppDispatch();
    const docked = useAppSelector(makeSelectDockedBubbles(universeId));
    const focusedBubbleId = useAppSelector(makeSelectFocusedBubbleId(universeId));
    const hovered = useHoveredBubble();

    // 岸では位置を使わないので、面の変換は恒等でよい
    const surfaceLayer = useMemo(() => new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }), []);
    const vanishingPoint = useMemo(() => ({ x: 0, y: 0 }), []);
    const renderContent = useCallback(
      (b: Bubble) => renderBubbleContent?.(b) ?? null,
      [renderBubbleContent],
    );

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

    // 海の縁と、岸に着いたバブルたち。まとめて 1 本の網として描く
    const tubeOutlines: ShowreTubeOutline[] = [
      { rect: { x: 0, y: 0, width: viewport.width, height: viewport.height } },
      ...docked.map(({ bubble, dock }) => {
        const rect = anchoredRect(dock, bubble.size ?? bubble.defaultSize, viewport);
        return {
          rect,
          // 管を引くかどうかは**いま接している辺**で決める。留め方（dock.edges）は
          // 「落としたときにどの辺へ寄せたか」なので、伸ばして端に着いた辺は入らない。
          // 下辺に留めたまま左端まで伸ばせば、左にも着く（最大 4 辺）
          joined: touchingEdges(rect, viewport),
          // 中身（アプリ）には光を入れない。中身は管の内側に収まっている
          keepOut: {
            x: rect.x + TUBE_THICKNESS,
            y: rect.y + TUBE_THICKNESS,
            width: Math.max(0, rect.width - TUBE_THICKNESS * 2),
            height: Math.max(0, rect.height - TUBE_THICKNESS * 2),
          },
        };
      }),
    ];

    return (
      <Overlay data-showre-overlay={universeId}>
        {docked.map(({ bubble, dock }) => {
          return (
            <ShowreContext.Provider key={bubble.id} value={dock.edges}>
              {/* 貼り付いたあとの矩形に置くだけ。中身も見た目も海に居るときと同じ */}
              <Slot data-docked-bubble-id={bubble.id} style={slotStyle(dock, viewport, bubble.size)}>
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
            </ShowreContext.Provider>
          );
        })}
        {/* 管は 1 枚にまとめて描く ── 海の縁も、岸に着いたバブルも、1 本の網 */}
        <ShowreTubes viewport={viewport} outlines={tubeOutlines} />

        {preview && (
          <Preview
            data-showre-preview=""
            style={{
              left: preview.rect.x,
              top: preview.rect.y,
              width: preview.rect.width,
              height: preview.rect.height,
            }}
          />
        )}
      </Overlay>
    );
  },
);
ShowreOverlay.displayName = "ShowreOverlay";

const Overlay = styled.div<DivProps>`
  position: absolute;
  inset: 0;
  /* 海は削らない。素通しにして、貼り付いたバブルだけが触れる。
     ヘッダーは箱の外（上）に出るので、切り抜かない */
  pointer-events: none;
  z-index: 200;
`;

/**
 * 貼り付いたバブルの置き場所。
 *
 * ★ 大きさは指定しない。留めるのは**辺だけ**（左に貼ったら `left: 0`、下なら `bottom: 0`）で、
 *   箱の大きさはバブル自身が決める。だから下辺に貼ったまま上辺を掴んで縮めても、
 *   下辺は動かず上辺だけが動く（場合分けは要らない）。
 */
const Slot = styled.div<DivProps>`
  position: absolute;
  pointer-events: auto;
`;

/** ドラッグ中の「いま離したらここ」の予告。岸でも海でも、離したあとの実寸そのまま */
const Preview = styled.div<DivProps>`
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.12);
  border: 2px dashed rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
`;
