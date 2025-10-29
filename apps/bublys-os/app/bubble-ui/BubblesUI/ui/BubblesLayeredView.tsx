import React, { FC, use } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2 } from "@bublys-org/bubbles-ui";
import { BubbleView } from "./BubbleView";
import { BubbleContent } from "./BubbleContent";
import { useAppSelector } from "@bublys-org/state-management";
import { selectBubblesRelationsWithBubble } from "@bublys-org/bubbles-ui-state";


type BubblesLayeredViewProps = {
  bubbles: Bubble[][];
  vanishingPoint?: Point2;
  onBubbleClick?: (name: string) => void;
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
};

export const BubblesLayeredView: FC<BubblesLayeredViewProps> = ({
  bubbles,
  vanishingPoint,
  onBubbleClick,
  onBubbleClose,
  onBubbleMove,
  onBubbleLayerDown,
  onBubbleLayerUp,
}) => {

  const relations = useAppSelector(selectBubblesRelationsWithBubble);

  const surfaceLeftTop: Point2 = { x: 100, y: 100 };
  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const baseZIndex = 100;

  const bubbleIdToZIndex: Record<string, number> = {};

  const renderedBubbles = bubbles
    .map((layer, layerIndex) =>
      layer.map((bubble, xIndex) => {
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
            onMoveClick={() => onBubbleMove?.(bubble)}
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

          console.log({linkZIndex, openerZ: bubbleIdToZIndex[opener.id], openeeZ: bubbleIdToZIndex[openee.id]});
          
          if (!opener.renderedRect || !openee.renderedRect) return null;

          return(
            <div key={opener.id + "_" + openee.id} style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: linkZIndex,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}>
              <svg width="100%" height="100%">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="0"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="red" />
                  </marker>
                </defs>
                {/* 文字列表示 */}

                <path
                  d={`M ${opener.renderedRect.x || 0} ${opener.renderedRect.y || 0} L ${openee.renderedRect.x || 0} ${openee.renderedRect.y || 0} L ${openee.renderedRect.left || 0} ${openee.renderedRect.bottom || 0} L ${opener.renderedRect.left || 0} ${opener.renderedRect.bottom || 0} Z`}
                  stroke="none"
                  strokeWidth="2"
                  fill={opener.colorHue === undefined ? "rgba(255,0,0,0.5)" : `hsla(${opener.colorHue}, 50%, 50%, 0.3)`}
                />
              </svg>

            </div>
          )
        })
      }

    </StyledBubblesLayeredView>
  );
};

type StyledBubblesLayeredViewProps = {
  surface: { leftTop: Point2 };
  underground: { vanishingPoint?: Point2 };
  surfaceZIndex?: number;
  children?: React.ReactNode;
};

const StyledBubblesLayeredView = styled.div<StyledBubblesLayeredViewProps>`
  width: 100vw;
  height: 100vh;
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
    backdrop-filter: blur(5px);
    pointer-events: none;
  }

  > .e-debug-visualizations {
    .e-surface-border {
      position: absolute;
      top: ${({ surface }) => surface.leftTop.y}px;
      left: ${({ surface }) => surface.leftTop.x}px;
      width: calc(100vw - ${({ surface }) => surface.leftTop.x}px);
      height: calc(100vh - ${({ surface }) => surface.leftTop.y}px);
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
