"use client";
import { FC, useContext, useLayoutEffect, useEffect, useState, useMemo, memo } from "react";
import styled from "styled-components";
import { Bubble } from "../Bubble.domain.js";
import { Point2, Vec2, CoordinateSystem, SmartRect } from "@bublys-org/bubbles-ui-util";
import { useMyRectObserver } from "../hooks/useMyRect.js";
import { useBubbleDrag } from "../hooks/useBubbleDrag.js";
import { useBubbleResize } from "../hooks/useBubbleResize.js";
import { useAppDispatch } from "@bublys-org/state-management";
import { renderBubble, updateBubble, finishBubbleAnimation, focusBubble } from "../state/bubbles-slice.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useBubbleRefsOptional } from "../context/BubbleRefsContext.js";
import { measureViewport } from "../utils/measure-viewport.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { Layer } from "@bublys-org/bubbles-ui-util";

/**
 * Universe（window 型）バブルの専用シェル。
 * BubbleView と違い、中身は固有サイズを持たず、常にバブルいっぱいに広がる
 * 「窓」として扱う。コンテンツ領域は透明で、中の universe / iframe / 等が
 * そのまま見える。
 */

const CloseIcon: FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MaximizeIcon: FC<{ size?: number; isMaximized: boolean }> = ({ size = 16, isMaximized }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {isMaximized ? (
      <>
        <path d="M8 8L10 10M16 16L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 8L14 10M8 16L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    )}
  </svg>
);

const LayerUpIcon: FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 14L12 9L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LayerDownIcon: FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 10L12 15L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HEADER_PROXIMITY_THRESHOLD = 40;

type UniverseBubbleViewProps = {
  bubble: Bubble;
  position?: Point2;
  vanishingPoint?: Point2;
  layerIndex?: number;
  zIndex?: number;
  isFocused?: boolean;
  /** ヘッダー右側に追加で挟みたいコントロール（例: ←→ 世界線ナビ） */
  headerExtras?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCloseClick?: (bubble: Bubble) => void;
  onLayerDownClick?: (bubble: Bubble) => void;
  onLayerUpClick?: (bubble: Bubble) => void;
  onResize?: (bubble: Bubble) => void;
  onDebugRects?: (rects: SmartRect[]) => void;
};

const UniverseBubbleViewInner: FC<UniverseBubbleViewProps> = ({
  bubble,
  children,
  layerIndex,
  zIndex,
  isFocused = false,
  position = { x: 0, y: 0 },
  vanishingPoint = new Vec2({ x: 0, y: 0 }),
  headerExtras,
  onClick,
  onCloseClick,
  onLayerDownClick,
  onLayerUpClick,
  onResize,
  onDebugRects,
}) => {
  const vanishingPointRelative = useMemo(
    () => new Vec2(vanishingPoint).subtract(position),
    [vanishingPoint, position],
  );

  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { pageSize, surfaceLeftTop } = useContext(BubblesContext);
  const bubbleRefs = useBubbleRefsOptional();

  const { ref, notifyRendered } = useMyRectObserver({
    onRectChanged: (rect: SmartRect) => {
      const updated = bubble.rendered(rect);
      dispatch(renderBubble(updated.toJSON(), universeId));
      onDebugRects?.([rect]);
    },
  });

  const { onDragStart } = useBubbleDrag({ bubble, ref, layerIndex, vanishingPoint });
  const { onResizeStart } = useBubbleResize({ bubble, ref });

  const [isMouseNearTop, setIsMouseNearTop] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);

  const isHeaderVisible = isFocused || isMouseNearTop;

  const updateHeaderSafeZone = () => {
    const bubbleRect = ref.current?.getBoundingClientRect();
    if (!bubbleRect) return;
    const headerEl = ref.current?.querySelector('.e-window-header');
    const headerHeight = headerEl?.getBoundingClientRect().height ?? 40;
    const headerTopInViewport = bubbleRect.top - headerHeight;
    setHeaderOffset(Math.max(0, -headerTopInViewport));
  };

  useEffect(() => {
    if (isFocused) updateHeaderSafeZone();
  }, [isFocused]);

  const isMaximized = bubble.isMaximized;

  const handleToggleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) {
      const resized = bubble.restore();
      dispatch(updateBubble(resized.toJSON(), universeId));
      onResize?.(resized);
    } else {
      if (!pageSize) return;
      const viewport = measureViewport();
      if (!viewport) return;
      const surfaceLayer = new Layer(0, surfaceLeftTop, vanishingPoint);
      const visible = viewport.visibleRegion();
      const newPosition = visible.origin;
      const availableWidth = visible.size.width - surfaceLayer.surfaceOrigin.x;
      const availableHeight = visible.size.height - surfaceLayer.surfaceOrigin.y;
      const resized = bubble.maximizeTo({ width: availableWidth, height: availableHeight }).moveTo(newPosition);
      dispatch(updateBubble(resized.toJSON(), universeId));
      onResize?.(resized);
    }
  };

  const handleMouseDown = () => {
    dispatch(focusBubble(bubble.id, universeId));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setIsMouseNearTop(e.clientY - rect.top < HEADER_PROXIMITY_THRESHOLD);
    updateHeaderSafeZone();
  };

  const handleMouseLeave = () => {
    setIsMouseNearTop(false);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    onDragStart(e);
  };

  useLayoutEffect(() => {
    if (ref.current && bubbleRefs) {
      bubbleRefs.registerBubbleRef(bubble.id, ref.current);
    }
    return () => {
      if (bubbleRefs) {
        bubbleRefs.unregisterBubbleRef(bubble.id);
      }
    };
  }, [bubble.id, bubbleRefs, ref]);

  return (
    <StyledWindow
      ref={ref}
      data-bubble-id={bubble.id}
      data-window-style="universe"
      $colorHue={bubble.colorHue}
      $zIndex={zIndex}
      $layerIndex={layerIndex}
      $position={position}
      $transformOrigin={vanishingPointRelative}
      $headerVisible={isHeaderVisible}
      $headerOffset={headerOffset}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={() => {
        notifyRendered();
        dispatch(finishBubbleAnimation(bubble.id));
      }}
      $width={bubble.size ? `${bubble.size.width}px` : undefined}
      $height={bubble.size ? `${bubble.size.height}px` : undefined}
      $backdropColor={bubble.backdropColor}
    >
      <header className="e-window-header" onMouseDown={handleHeaderMouseDown}>
        <div className="e-window-buttons-left">
          {onCloseClick && (
            <button
              className="e-window-button e-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseClick(bubble);
              }}
              title="閉じる"
            >
              <CloseIcon />
            </button>
          )}
          <button
            className="e-window-button e-maximize"
            onClick={handleToggleSize}
            title={isMaximized ? "フィット" : "最大化"}
          >
            <MaximizeIcon isMaximized={isMaximized} />
          </button>
        </div>
        <div className="e-window-title">{bubble.type}</div>
        <div className="e-window-buttons-right">
          {headerExtras}
          {onLayerDownClick && (
            <button
              className="e-window-button e-layer"
              onClick={(e) => {
                e.stopPropagation();
                onLayerDownClick(bubble);
              }}
              title="奥のレイヤーへ"
            >
              <LayerUpIcon />
            </button>
          )}
          {onLayerUpClick && (
            <button
              className="e-window-button e-layer"
              onClick={(e) => {
                e.stopPropagation();
                onLayerUpClick(bubble);
              }}
              title="手前のレイヤーへ"
            >
              <LayerDownIcon />
            </button>
          )}
        </div>
      </header>

      <div className="e-header-hover-trigger" />

      <main className="e-window-content">{children}</main>

      {/* 右下リサイズハンドル — ユーザーがサイズを決められる状態への入り口 */}
      <div
        className="e-resize-handle"
        onMouseDown={onResizeStart}
        title="サイズ調整"
      />
    </StyledWindow>
  );
};

export const UniverseBubbleView = memo(UniverseBubbleViewInner, (prev, next) => {
  if (prev.bubble !== next.bubble) {
    const a = prev.bubble;
    const b = next.bubble;
    const onlyPositionChanged =
      a.id === b.id &&
      a.url === b.url &&
      a.type === b.type &&
      a.colorHue === b.colorHue &&
      a.size?.width === b.size?.width &&
      a.size?.height === b.size?.height &&
      a.isMaximized === b.isMaximized;
    if (!onlyPositionChanged) return false;
  }
  if (prev.position?.x !== next.position?.x || prev.position?.y !== next.position?.y) return false;
  if (prev.layerIndex !== next.layerIndex || prev.zIndex !== next.zIndex) return false;
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.headerExtras !== next.headerExtras) return false;
  return true;
});

type StyledWindowProps = React.HTMLAttributes<HTMLDivElement> & {
  $position?: Point2;
  $layerIndex?: number;
  $zIndex?: number;
  $transformOrigin?: Vec2;
  $colorHue: number;
  $width?: string;
  $height?: string;
  $backdropColor?: string;
  $headerVisible?: boolean;
  $headerOffset?: number;
  ref: React.RefObject<HTMLDivElement | null>;
};

const StyledWindow = styled.div<StyledWindowProps>`
  position: absolute;

  /* universe バブル自身の「色付きガラス」は背後を透視可能にする ─ クリックは
     奥（親 universe のオブジェクト）にも届く。ヘッダーだけ explicit auto で
     受け止めて、body や content の素地は none に流す。 */
  pointer-events: none;

  width: ${({ $width }) => $width || "fit-content"};
  height: ${({ $height }) => $height || "auto"};
  z-index: ${({ $zIndex }) => ($zIndex !== undefined ? $zIndex : 0)};
  left: ${({ $position }) => ($position ? `${$position.x}px` : "0")};
  top: ${({ $position }) => ($position ? `${$position.y}px` : "0")};

  transition-property: left top transform;
  transition: 0.3s ease-in-out;

  transform-origin: ${({ $transformOrigin }) =>
    $transformOrigin ? `${$transformOrigin.x}px ${$transformOrigin.y}px` : "center center"};
  transform: scale(${({ $layerIndex }) => CoordinateSystem.fromLayerIndex($layerIndex ?? 0).scale});

  max-height: 90vh;

  display: flex;
  flex-direction: column;

  background: ${({ $backdropColor, $colorHue }) =>
    $backdropColor
      ? `color-mix(in srgb, ${$backdropColor} 55%, transparent)`
      : `hsla(${$colorHue}, 50%, 60%, 0.45)`};
  border: 1px solid hsla(${({ $colorHue }) => $colorHue}, 60%, 65%, 0.45);
  border-radius: 14px;
  box-shadow:
    0 8px 32px hsla(${({ $colorHue }) => $colorHue}, 50%, 30%, 0.3),
    0 2px 8px hsla(0, 0%, 0%, 0.1);

  > .e-window-header {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    z-index: 1;
    cursor: move;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 14px;
    background: hsla(${({ $colorHue }) => $colorHue}, 45%, 20%, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid hsla(${({ $colorHue }) => $colorHue}, 50%, 50%, 0.35);
    color: hsla(0, 0%, 100%, 0.9);
    font-size: 0.8em;

    opacity: ${({ $headerVisible }) => $headerVisible ? 1 : 0};
    pointer-events: ${({ $headerVisible }) => $headerVisible ? 'auto' : 'none'};
    transform: ${({ $headerVisible, $headerOffset = 0 }) =>
      $headerVisible ? `translateY(${$headerOffset}px)` : `translateY(${$headerOffset + 6}px)`};
    transition: opacity 0.15s ease, transform 0.15s ease;

    .e-window-buttons-left,
    .e-window-buttons-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .e-window-title {
      flex: 1;
      text-align: center;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: hsla(0, 0%, 100%, 0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-window-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.75);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: hsla(0, 0%, 100%, 0.22);
        color: hsla(0, 0%, 100%, 1);
        transform: scale(1.08);
      }
      &:active {
        transform: scale(0.94);
      }
      &.e-close:hover {
        background: hsla(0, 70%, 55%, 0.7);
        color: white;
      }
      &.e-maximize:hover {
        background: hsla(210, 70%, 55%, 0.5);
      }
      &.e-layer:hover {
        background: hsla(270, 60%, 60%, 0.45);
      }
    }
  }

  /* キーボードフォーカス時もヘッダーを表示（アクセシビリティ）。
     transform は JS 管理（$headerOffset 込み）なので上書きしない。 */
  &:focus-within > .e-window-header {
    opacity: 1;
    pointer-events: auto;
  }

  > .e-window-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    /* コンテンツ側（universe など）が自前で背景を塗るので、ここは透明。 */
    background: transparent;
    position: relative;
    padding: 8px;
    border-radius: 8px;
  }

  > .e-header-hover-trigger {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${HEADER_PROXIMITY_THRESHOLD}px;
    pointer-events: auto;
  }

  /* 右下リサイズハンドル: StyledWindow が pointer-events: none なので explicit auto。 */
  > .e-resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 18px;
    height: 18px;
    cursor: nwse-resize;
    z-index: 5;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.15s ease;
    background:
      linear-gradient(135deg, transparent 0%, transparent 45%, hsla(0, 0%, 100%, 0.6) 45%, hsla(0, 0%, 100%, 0.6) 55%, transparent 55%) no-repeat,
      linear-gradient(135deg, transparent 0%, transparent 65%, hsla(0, 0%, 100%, 0.4) 65%, hsla(0, 0%, 100%, 0.4) 75%, transparent 75%) no-repeat;
  }

  &:hover > .e-resize-handle {
    opacity: 1;
  }
`;
