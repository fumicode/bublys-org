import React, { FC, useRef, useLayoutEffect, memo, useMemo, useState } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { BubbleView } from "./BubbleView";
import { BubbleContent } from "./BubbleContent";
import { useAppSelector } from "@bublys-org/state-management";
import { MagicWandActionCallback } from "../../MagicWand/domain/MagicWandState";
import {
  selectValidBubbleRelationIds,
  selectGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  selectIsLayerAnimating,
  makeSelectBubbleById,
} from "@bublys-org/bubbles-ui-state";
import { LinkBubbleView } from "./LinkBubbleView";

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
  isLayerHovered?: boolean;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onMagicWandAction?: MagicWandActionCallback;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
};

const ConnectedBubbleView: FC<ConnectedBubbleViewProps> = memo(function ConnectedBubbleView({
  bubbleId,
  layerIndex,
  zIndex,
  vanishingPoint,
  surfaceLeftTop,
  hasLeftLink,
  isLayerHovered,
  onBubbleClick,
  onBubbleClose,
  onMagicWandAction,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
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
      isLayerHovered={isLayerHovered}
      onClick={() => onBubbleClick?.(bubble.url)}
      onCloseClick={() => onBubbleClose?.(bubble)}
      onMagicWandAction={onMagicWandAction}
      onMove={(updated) => onBubbleMove?.(updated)}
      onResize={(updated) => onBubbleResize?.(updated)}
      onLayerDownClick={() => onBubbleLayerDown?.(bubble)}
      onLayerUpClick={() => onBubbleLayerUp?.(bubble)}
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

/**
 * 各レイヤーのcoordinate systemを視覚化するガラス板
 */
type LayerGlassProps = {
  layerIndex: number;
  surfaceLeftTop: Point2;
  vanishingPoint: Point2;
  baseZIndex: number;
  isHovered?: boolean;
  isLocked?: boolean;
  onHover?: (layerIndex: number | null) => void;
  onLock?: (layerIndex: number | null) => void;
};

const LayerGlass: FC<LayerGlassProps> = memo(function LayerGlass({
  layerIndex,
  surfaceLeftTop,
  vanishingPoint,
  baseZIndex,
  isHovered,
  isLocked,
  onHover,
  onLock,
}) {
  const scale = CoordinateSystem.fromLayerIndex(layerIndex).scale;
  const transformOriginX = vanishingPoint.x - surfaceLeftTop.x;
  const transformOriginY = vanishingPoint.y - surfaceLeftTop.y;
  const isSurface = layerIndex === 0;
  const isHighlighted = isHovered || isLocked;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // コンテナへの伝播を防ぐ
    // ロック中なら解除、そうでなければロック
    onLock?.(isLocked ? null : layerIndex);
  };

  return (
    <>
      {/* ガラス板本体（装飾用、イベントなし） */}
      <div
        className="e-layer-glass"
        style={{
          position: 'absolute',
          top: surfaceLeftTop.y,
          left: surfaceLeftTop.x,
          width: `calc(100% - ${surfaceLeftTop.x}px)`,
          height: `calc(100% - ${surfaceLeftTop.y}px)`,
          borderRadius: 24,
          background: isSurface ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          border: `1px solid rgba(255, 255, 255, ${isSurface ? 0.2 : isHighlighted ? 0.3 : 0.1})`,
          backdropFilter: isSurface ? 'blur(1px)' : 'none',
          boxShadow: isSurface
            ? '0 4px 30px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.05)'
            : 'none',
          pointerEvents: 'none',
          zIndex: baseZIndex - layerIndex - 0.5,
          transform: `scale(${scale})`,
          transformOrigin: `${transformOriginX}px ${transformOriginY}px`,
        }}
      />
      {/* 左端のホバー領域（ガラスの外側に配置、棒状） */}
      <div
        className="e-layer-glass-handle"
        style={{
          position: 'absolute',
          top: surfaceLeftTop.y,
          left: surfaceLeftTop.x - 18,
          width: 12,
          height: `calc(100% - ${surfaceLeftTop.y}px)`,
          borderRadius: 6,
          background: isLocked ? 'rgba(255, 255, 255, 0.5)' : isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          zIndex: baseZIndex + 10,
          transform: `scale(${scale})`,
          transformOrigin: `${transformOriginX + 18}px ${transformOriginY}px`,
        }}
        onMouseEnter={() => onHover?.(layerIndex)}
        onMouseLeave={() => onHover?.(null)}
        onClick={handleClick}
      />
    </>
  );
});

type BubblesLayeredViewProps = {
  bubbleLayers: string[][];  // IDの配列に変更
  vanishingPoint?: Point2;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onMagicWandAction?: MagicWandActionCallback;
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
  onMagicWandAction,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onCoordinateSystemReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLayerIndex, setHoveredLayerIndex] = useState<number | null>(null);
  const [lockedLayerIndex, setLockedLayerIndex] = useState<number | null>(null);

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
        const isLayerHovered = hoveredLayerIndex === layerIndex || lockedLayerIndex === layerIndex;

        return (
          <ConnectedBubbleView
            key={bubbleId}
            bubbleId={bubbleId}
            layerIndex={layerIndex}
            zIndex={zIndex}
            vanishingPoint={undergroundVanishingPoint}
            surfaceLeftTop={surfaceLeftTop}
            hasLeftLink={hasLeftLink}
            isLayerHovered={isLayerHovered}
            onBubbleClick={onBubbleClick}
            onBubbleClose={onBubbleClose}
            onMagicWandAction={onMagicWandAction}
            onBubbleMove={onBubbleMove}
            onBubbleResize={onBubbleResize}
            onBubbleLayerDown={onBubbleLayerDown}
            onBubbleLayerUp={onBubbleLayerUp}
          />
        );
      })
    )
    .flat();

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onClick={() => setLockedLayerIndex(null)}
    >
      <StyledBubblesLayeredView
        surface={{ leftTop: surfaceLeftTop }}
        underground={{ vanishingPoint: undergroundVanishingPoint }}
        surfaceZIndex={baseZIndex - 2}
      >
        {renderedBubbles}
        <div className="e-underground-curtain"></div>
        <div className="e-coordinate-layers">
          {/* 各レイヤーのcoordinate systemを表すLayerGlass */}
          {bubbleLayers.map((_, layerIndex) => (
            <LayerGlass
              key={`layer-glass-${layerIndex}`}
              layerIndex={layerIndex}
              surfaceLeftTop={surfaceLeftTop}
              vanishingPoint={undergroundVanishingPoint}
              baseZIndex={baseZIndex}
              isHovered={hoveredLayerIndex === layerIndex}
              isLocked={lockedLayerIndex === layerIndex}
              onHover={setHoveredLayerIndex}
              onLock={setLockedLayerIndex}
            />
          ))}
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

  > .e-coordinate-layers {
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
