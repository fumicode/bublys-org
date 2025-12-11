import React, { FC, useRef, useLayoutEffect } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { BubbleView } from "./BubbleView";
import { BubbleContent } from "./BubbleContent";
import { useAppSelector } from "@bublys-org/state-management";
import { selectBubblesRelationsWithBubble, selectGlobalCoordinateSystem, selectSurfaceLeftTop } from "@bublys-org/bubbles-ui-state";
import { LinkBubbleView } from "./LinkBubbleView";

type BubblesLayeredViewProps = {
  bubbles: Bubble[][];
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
  bubbles,
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

        const coordinateSystem: CoordinateSystem = {
          layerIndex: 0,
          offset: { x: rect.left, y: rect.top },
          vanishingPoint: currentVanishingPoint,
        };
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

  const relations = useAppSelector(selectBubblesRelationsWithBubble);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);
  const coordinateSystem = useAppSelector(selectGlobalCoordinateSystem);

  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const baseZIndex = 100;

  const bubbleIdToZIndex: Record<string, number> = {};

  const renderedBubbles = bubbles
    .map((layer, layerIndex) =>
      layer.map((bubble, _siblingIndex) => {
        const zIndex = baseZIndex - layerIndex;

        // bubbleIdのレイヤー番号を記録
        bubbleIdToZIndex[bubble.id] = zIndex;

        // calculate position based on existing bubble properties
        const pos = new Vec2(bubble.position || { x: 0, y: 0 })
          .add(surfaceLeftTop);

        return (
          <BubbleView
            bubble={bubble}
            position={pos}
            key={bubble.id}
            layerIndex={layerIndex}
            zIndex={zIndex}
            vanishingPoint={undergroundVanishingPoint}
            onClick={() => onBubbleClick?.(bubble.name)}
            onCloseClick={() => onBubbleClose?.(bubble)}
            onMove={(updated) => onBubbleMove?.(updated)}
            onResize={(updated) => onBubbleResize?.(updated)}
            onLayerDownClick={() => onBubbleLayerDown?.(bubble)}
            onLayerUpClick={() => onBubbleLayerUp?.(bubble)}
          >
            <BubbleContent bubble={bubble} />
          </BubbleView>
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
        <div className="e-underground-curtain">curtain</div>
        <div className="e-debug-visualizations">
          <div className="e-surface-border">surface</div>
          <div className="e-underground-border">underground</div>
          <div className="e-vanishing-point"></div>
        </div>

        {
          relations.map(({ opener, openee }) => {

            const linkZIndex = bubbleIdToZIndex[openee.id] - 1;

            return(
              <LinkBubbleView
                key={`${opener.id}_${openee.id}`}
                opener={opener}
                openee={openee}
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

  > .e-underground-curtain {
    position: absolute;
    top: 0;
    left: 0;
    z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};
    width: 100%;
    height: 100%;
    backdrop-filter: blur(1px);
    pointer-events: none;
  }

  > .e-debug-visualizations {
    .e-surface-border {
      position: absolute;
      top: ${({ surface }) => surface.leftTop.y}px;
      left: ${({ surface }) => surface.leftTop.x}px;
      width: calc(100% - ${({ surface }) => surface.leftTop.x}px);
      height: calc(100% - ${({ surface }) => surface.leftTop.y}px);
      border: 2px solid red;
      pointer-events: none;
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
