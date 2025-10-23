import React, { FC } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2 } from "@bublys-org/bubbles-ui";
import { BubbleView } from "./BubbleView";
import { BubbleContent } from "./BubbleContent";

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
  const surfaceLeftTop: Point2 = { x: 100, y: 100 };
  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const baseZIndex = 100;

  const renderedBubbles = bubbles
    .map((layer, layerIndex) =>
      layer.map((bubble, xIndex) => {
        // calculate position based on existing bubble properties
        const pos = new Vec2(bubble.position || { x: 0, y: 0 })
          .add(surfaceLeftTop);

        return (
          <BubbleView
            bubble={bubble}
            position={pos}
            key={bubble.id}
            layerIndex={layerIndex}
            zIndex={baseZIndex - layerIndex}
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
