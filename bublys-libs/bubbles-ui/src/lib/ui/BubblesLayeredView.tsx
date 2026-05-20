import React, { FC, ReactNode, useRef, useLayoutEffect, memo, useMemo, useState } from "react";
import styled from "styled-components";
import { useAppSelector } from "@bublys-org/state-management";
import { Bubble } from "../Bubble.domain.js";
import { Point2, Layer, CoordinateSystem, SmartRect } from "@bublys-org/bubbles-ui-util";
import { BubbleView } from "./BubbleView.js";
import { LinkBubbleView } from "./LinkBubbleView.js";
import { BubbleContent } from "./BubbleContent.js";
import { UniverseContext } from "../context/UniverseContext.js";
import { UNIVERSE_SIZE } from "../universe-config.js";
import {
  selectValidBubbleRelationIds,
  selectGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  selectIsLayerAnimating,
  makeSelectBubbleById,
} from "../state/index.js";

/**
 * 個別バブルを自分でReduxから取得するラッパーコンポーネント
 */
type ConnectedBubbleViewProps = {
  bubbleId: string;
  layerIndex: number;
  zIndex: number;
  vanishingPoint: Point2;
  surfaceLayer: Layer;
  hasLeftLink?: boolean;
  renderBubbleContent: (bubble: Bubble) => ReactNode;
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
  surfaceLayer,
  hasLeftLink,
  renderBubbleContent,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onDebugRects,
})  {
  const selectBubble = useMemo(() => makeSelectBubbleById(bubbleId), [bubbleId]);
  const bubble = useAppSelector(selectBubble);

  if (!bubble) return null;

  // bubble.position は layer-local 座標。surface レイヤーで universe 座標へ写す
  const pos = surfaceLayer.place(bubble.position || { x: 0, y: 0 });

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
      {renderBubbleContent(bubble)}
    </BubbleView>
  );
});

/**
 * 個別のLinkBubbleを自分でReduxから取得するラッパーコンポーネント
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

export type BubblesLayeredViewProps = {
  bubbleLayers: string[][];
  vanishingPoint?: Point2;
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleResize?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
  onCoordinateSystemReady?: (coordinateSystem: CoordinateSystem) => void;
  onDebugRects?: (rects: SmartRect[]) => void;
};

const defaultRenderBubbleContent = (bubble: Bubble): ReactNode => (
  <BubbleContent bubble={bubble} />
);

export const BubblesLayeredView: FC<BubblesLayeredViewProps> = ({
  bubbleLayers,
  vanishingPoint,
  renderBubbleContent = defaultRenderBubbleContent,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleResize,
  onBubbleLayerDown,
  onBubbleLayerUp,
  onCoordinateSystemReady,
  onDebugRects,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const universeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let lastVanishingPoint = { x: 0, y: 0 };
    let coordinateSystemEmitted = false;

    const updateOnViewportChange = () => {
      if (!viewportRef.current) return;

      const currentVanishingPoint = vanishingPoint || { x: 0, y: 0 };

      // CoordinateSystem は universe 座標系を表現する。offset は常に 0
      // （universe 起点 = 「global」起点）。vanishingPoint は universe 座標で指定。
      if (
        coordinateSystemEmitted &&
        currentVanishingPoint.x === lastVanishingPoint.x &&
        currentVanishingPoint.y === lastVanishingPoint.y
      ) {
        return;
      }
      lastVanishingPoint = currentVanishingPoint;
      coordinateSystemEmitted = true;

      const coordinateSystem = new CoordinateSystem(
        0,
        { x: 0, y: 0 },
        currentVanishingPoint
      );
      onCoordinateSystemReady?.(coordinateSystem);
    };

    updateOnViewportChange();

    const resizeObserver = new ResizeObserver(() => {
      updateOnViewportChange();
    });

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateOnViewportChange();
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

  const [showSurfaceBorder, setShowSurfaceBorder] = useState(true);
  const relationIds = useAppSelector(selectValidBubbleRelationIds);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);
  const coordinateSystem = useAppSelector(selectGlobalCoordinateSystem);
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const baseZIndex = 100;

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

  const openeeIds = useMemo(() => {
    return new Set(relationIds.map(r => r.openeeId));
  }, [relationIds]);

  // surface（最前面）レイヤー。bubble.position(layer-local) ⇄ universe 変換を担う
  const surfaceLayer = useMemo(
    () => new Layer(0, surfaceLeftTop, coordinateSystem.vanishingPoint),
    [surfaceLeftTop, coordinateSystem],
  );

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
            surfaceLayer={surfaceLayer}
            hasLeftLink={hasLeftLink}
            renderBubbleContent={renderBubbleContent}
            onBubbleClick={onBubbleClick}
            onBubbleClose={onBubbleClose}
            onBubbleMove={onBubbleMove}
            onBubbleResize={onBubbleResize}
            onBubbleLayerDown={onBubbleLayerDown}
            onBubbleLayerUp={onBubbleLayerUp}
            onDebugRects={onDebugRects}
          />
        );
      })
    )
    .flat();

  const universeContextValue = useMemo(() => ({ universeRef }), []);

  return (
    <UniverseContext.Provider value={universeContextValue}>
      <StyledFrame>
        <StyledViewport ref={viewportRef}>
          <StyledUniverse ref={universeRef}>
            {renderedBubbles}

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
          </StyledUniverse>
        </StyledViewport>

        <StyledHeadsUpDisplay
          surface={{ leftTop: surfaceLeftTop }}
          surfaceZIndex={baseZIndex - 2}
        >
          <div className="e-underground-curtain"></div>
          <div className="e-debug-visualizations">
            <div className={`e-surface-border ${showSurfaceBorder ? '' : 'is-hidden'}`}></div>
            <button
              className="e-surface-border-toggle"
              onClick={() => setShowSurfaceBorder((v) => !v)}
            >
              {showSurfaceBorder ? '◻' : '◼'}
            </button>
          </div>
        </StyledHeadsUpDisplay>
      </StyledFrame>
    </UniverseContext.Provider>
  );
};


type DivProps = React.HTMLAttributes<HTMLDivElement>;
type DivPropsWithRef = DivProps & { ref: React.RefObject<HTMLDivElement | null> };

const StyledFrame = styled.div<DivProps>`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  z-index: 0;

  background: linear-gradient(
    145deg,
    hsl(220, 35%, 18%) 0%,
    hsl(225, 40%, 22%) 40%,
    hsl(230, 35%, 20%) 100%
  );
`;

const StyledViewport = styled.div<DivPropsWithRef>`
  position: absolute;
  inset: 0;
  overflow: auto;
`;

const StyledUniverse = styled.div.attrs({ 'data-bubble-universe': '' })<DivPropsWithRef>`
  position: relative;
  width: ${UNIVERSE_SIZE}px;
  height: ${UNIVERSE_SIZE}px;
`;

type StyledHeadsUpDisplayProps = {
  surface: { leftTop: Point2 };
  surfaceZIndex?: number;
  children?: React.ReactNode;
};

const StyledHeadsUpDisplay = styled.div<StyledHeadsUpDisplayProps>`
  position: absolute;
  inset: 0;
  pointer-events: none;

  > .e-underground-curtain {
    position: absolute;
    top: 0;
    left: 0;
    z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
    width: 100%;
    height: 100%;
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
      z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
      transform-origin: left bottom;
      transition: transform 0.35s ease, opacity 0.35s ease;

      &.is-hidden {
        transform: scale(0);
        opacity: 0;
      }
    }

    .e-surface-border-toggle {
      position: absolute;
      bottom: 8px;
      left: ${({ surface }) => surface.leftTop.x + 8}px;
      z-index: ${({ surfaceZIndex }) => (surfaceZIndex || 0) + 1};
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.2s;
      pointer-events: auto;

      &:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
`;
