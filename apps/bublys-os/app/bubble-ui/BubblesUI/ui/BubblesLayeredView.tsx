import React, { FC, useRef, useLayoutEffect, memo, useMemo } from "react";
import styled from "styled-components";
import {
  Bubble,
  Point2,
  Vec2,
  CoordinateSystem,
  SmartRect,
  BubbleView,
  LinkBubbleView,
} from "@bublys-org/bubbles-ui";
import { BubbleContent } from "./BubbleContent";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectValidBubbleRelationIds,
  selectGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  selectIsLayerAnimating,
  makeSelectBubbleById,
} from "@bublys-org/bubbles-ui-state";
import { usePositionDebugger } from "../../PositionDebugger/domain/PositionDebuggerContext";

/**
 * 個別バブルを自分でReduxから取得するラッパーコンポーネント
 * このバブルが変わった時だけ再レンダリングされる
 */
type ConnectedBubbleViewProps = {
  bubbleId: string;
  layerIndex: number;
  zIndex: number;
  vanishingPoint: Point2;
  surfaceLeftTop: Point2;
  hasLeftLink?: boolean;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onDebugRects?: (rects: SmartRect[]) => void;
};

const ConnectedBubbleView: FC<ConnectedBubbleViewProps> = memo(function ConnectedBubbleView({
  bubbleId,
  layerIndex,
  zIndex,
  vanishingPoint,
  surfaceLeftTop,
  hasLeftLink,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onDebugRects,
})  {
  // このバブル専用のセレクターを使用
  const selectBubble = useMemo(() => makeSelectBubbleById(bubbleId), [bubbleId]);
  const bubble = useAppSelector(selectBubble);

  if (!bubble) return null;

  const pos = new Vec2(bubble.position || { x: 0, y: 0 }).add(surfaceLeftTop);

  return (
    <BubbleView
      bubble={bubble}
      position={pos}
      layerIndex={layerIndex}
      zIndex={zIndex}
      vanishingPoint={vanishingPoint}
      contentBackground={bubble.contentBackground ?? "white"}
      hasLeftLink={hasLeftLink}
      onClick={() => onBubbleClick?.(bubble.url)}
      onCloseClick={() => onBubbleClose?.(bubble)}
      onMove={(updated) => onBubbleMove?.(updated)}
      onResize={(updated) => onBubbleResize?.(updated)}
      onLayerDownClick={() => onBubbleLayerDown?.(bubble)}
      onLayerUpClick={() => onBubbleLayerUp?.(bubble)}
      onDebugRects={onDebugRects}
    >
      <BubbleContent bubble={bubble} />
    </BubbleView>
  );
});

/**
 * 個別のLinkBubbleを自分でReduxから取得するラッパーコンポーネント
 * opener/openeeが変わった時だけ再レンダリングされる
 */
type ConnectedLinkBubbleViewProps = {
  openerId: string;
  openeeId: string;
  coordinateSystem: CoordinateSystem;
  linkZIndex: number;
};

const ConnectedLinkBubbleView: FC<ConnectedLinkBubbleViewProps> = memo(function ConnectedLinkBubbleView({
  openerId,
  openeeId,
  coordinateSystem,
  linkZIndex,
}) {
  // 各バブル専用のセレクターを使用
  const selectOpener = useMemo(() => makeSelectBubbleById(openerId), [openerId]);
  const selectOpenee = useMemo(() => makeSelectBubbleById(openeeId), [openeeId]);
  const opener = useAppSelector(selectOpener);
  const openee = useAppSelector(selectOpenee);

  if (!opener || !openee) return null;

  return (
    <LinkBubbleView
      opener={opener}
      openee={openee}
      coordinateSystem={coordinateSystem}
      linkZIndex={linkZIndex}
    />
  );
});

type BubblesLayeredViewProps = {
  bubbleLayers: string[][];  // IDの配列に変更
  vanishingPoint?: Point2;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onCoordinateSystemReady?: (coordinateSystem: CoordinateSystem) => void;
};

export const BubblesLayeredView: FC<BubblesLayeredViewProps> = ({
  bubbleLayers,
  vanishingPoint,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onCoordinateSystemReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // コンテナの位置を取得してCoordinateSystemを設定（サイズ・位置変更時も更新）
  useLayoutEffect(() => {
    let lastOffset = { x: 0, y: 0 };
    let lastVanishingPoint = { x: 0, y: 0 };

    const updateCoordinateSystem = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentVanishingPoint = vanishingPoint || { x: 0, y: 0 };

        // 座標またはvanishingPointが変更された場合のみ更新（無限ループ防止）
        if (
          rect.left === lastOffset.x &&
          rect.top === lastOffset.y &&
          currentVanishingPoint.x === lastVanishingPoint.x &&
          currentVanishingPoint.y === lastVanishingPoint.y
        ) {
          return;
        }

        lastOffset = { x: rect.left, y: rect.top };
        lastVanishingPoint = currentVanishingPoint;

        const coordinateSystem = new CoordinateSystem(
          0,  // layerIndex
          { x: rect.left, y: rect.top },  // offset
          currentVanishingPoint  // vanishingPoint
        );
        onCoordinateSystemReady?.(coordinateSystem);
      }
    };

    // 初期設定
    updateCoordinateSystem();

    // ResizeObserverでサイズ変更を監視
    const resizeObserver = new ResizeObserver(() => {
      updateCoordinateSystem();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // windowのresizeイベントで位置変更も検出（サイドバー幅変更など）
    // requestAnimationFrameでスロットリング
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateCoordinateSystem();
        rafId = null;
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [onCoordinateSystemReady, vanishingPoint]);

  // IDベースの関係性のみ取得（パフォーマンス最適化）
  const relationIds = useAppSelector(selectValidBubbleRelationIds);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);
  const coordinateSystem = useAppSelector(selectGlobalCoordinateSystem);
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  // PositionDebuggerからaddRectsを取得
  const { addRects } = usePositionDebugger();

  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const baseZIndex = 100;

  // bubbleIdToZIndexを計算（LinkBubbleView用）
  const bubbleIdToZIndex: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    bubbleLayers.forEach((layer, layerIndex) => {
      const zIndex = baseZIndex - layerIndex;
      layer.forEach((bubbleId) => {
        result[bubbleId] = zIndex;
      });
    });
    return result;
  }, [bubbleLayers]);

  // リンクバブルが接続されているopenee IDのSet（左角丸を無効化するため）
  const openeeIds = useMemo(() => {
    return new Set(relationIds.map(r => r.openeeId));
  }, [relationIds]);

  // 各バブルをConnectedBubbleViewでレンダリング
  const renderedBubbles = bubbleLayers
    .map((layer, layerIndex) =>
      layer.map((bubbleId) => {
        const zIndex = baseZIndex - layerIndex;
        const hasLeftLink = openeeIds.has(bubbleId);

        return (
          <ConnectedBubbleView
            key={bubbleId}
            bubbleId={bubbleId}
            layerIndex={layerIndex}
            zIndex={zIndex}
            vanishingPoint={undergroundVanishingPoint}
            surfaceLeftTop={surfaceLeftTop}
            hasLeftLink={hasLeftLink}
            onBubbleClick={onBubbleClick}
            onBubbleClose={onBubbleClose}
            onBubbleMove={onBubbleMove}
            onBubbleResize={onBubbleResize}
            onBubbleLayerDown={onBubbleLayerDown}
            onBubbleLayerUp={onBubbleLayerUp}
            onDebugRects={addRects}
          />
        );
      })
    )
    .flat();

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <StyledBubblesLayeredView
        surface={{ leftTop: surfaceLeftTop }}
        underground={{ vanishingPoint: undergroundVanishingPoint }}
        surfaceZIndex={baseZIndex - 2}
      >
        {renderedBubbles}
        <div className="e-underground-curtain"></div>
        <div className="e-debug-visualizations">
          <div className="e-surface-border"></div>
          <div className="e-underground-border"></div>
          <div className="e-vanishing-point"></div>
        </div>

        {/* アニメーション中はLinkBubbleを非表示にする（位置ズレ防止） */}
        {!isLayerAnimating &&
          relationIds.map(({ openerId, openeeId }) => {
            const linkZIndex = bubbleIdToZIndex[openeeId] - 1;

            return(
              <ConnectedLinkBubbleView
                key={`${openerId}_${openeeId}`}
                openerId={openerId}
                openeeId={openeeId}
                coordinateSystem={coordinateSystem}
                linkZIndex={linkZIndex}
              />
            );
          })
        }

      </StyledBubblesLayeredView>
    </div>
  );
};

type StyledBubblesLayeredViewProps = {
  surface: { leftTop: Point2 };
  underground: { vanishingPoint?: Point2 };
  surfaceZIndex?: number;
  children?: React.ReactNode;
};

const StyledBubblesLayeredView = styled.div<StyledBubblesLayeredViewProps>`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  z-index: 0;

  // 上品な藍色のグラデーション背景
  background: linear-gradient(
    145deg,
    hsl(220, 35%, 18%) 0%,
    hsl(225, 40%, 22%) 40%,
    hsl(230, 35%, 20%) 100%
  );

  > .e-underground-curtain {
    position: absolute;
    top: 0;
    left: 0;
    z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  > .e-debug-visualizations {
    .e-surface-border {
      position: absolute;
      top: ${({ surface }) => surface.leftTop.y}px;
      left: ${({ surface }) => surface.leftTop.x}px;
      width: calc(100% - ${({ surface }) => surface.leftTop.x}px);
      height: calc(100% - ${({ surface }) => surface.leftTop.y}px);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(1px);
      box-shadow:
        0 4px 30px rgba(0, 0, 0, 0.05),
        inset 0 0 20px rgba(255, 255, 255, 0.05);
      pointer-events: none;
      // layerIndex 0,1 はぼかしの上に、layerIndex 2以降はぼかしの下に
      z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
    }
    .e-vanishing-point {
      position: absolute;
      top: ${({ underground }) => underground.vanishingPoint?.y || 0}px;
      left: ${({ underground }) => underground.vanishingPoint?.x || 0}px;
      width: 8px;
      height: 8px;
      background: blue;
      border-radius: 50%;
      pointer-events: none;
    }
  }
`;
