import { FC, Fragment } from "react";
import styled from "styled-components";
import { Bubble, BubblesProcess } from "../domain/Bubbles.domain";
import { Point2, Vec2 } from "../../01_Utils/00_Point";
import { BubbleView } from "./BubbleView";
import { BubbleContent } from "./BubbleContent";

type BubblesLayeredViewProps = {
  bubbles: BubblesProcess;
  vanishingPoint?: Point2; // バニシングポイントを指定するためのオプション
  onBubbleClick?: (name: string) => void; // バブルがクリックされたときのコールバック
  onBubbleClose?: (bubble: Bubble) => void;
  onBubbleMove?: (bubble: Bubble) => void;
  onBubbleLayerDown?: (bubble: Bubble) => void;
  onBubbleLayerUp?: (bubble: Bubble) => void;
};

export const BubblesLayeredView: FC<BubblesLayeredViewProps> = (props) => {
  const { bubbles: bubblesProcess, vanishingPoint } = props;

  const surfaceLeftTop: Point2 = { x: 100, y: 100 };
  const undergroundVanishingPoint: Point2 = vanishingPoint || {
    x: 20,
    y: 10,
  };

  const zIndex = 100 - 1; // z-indexの基準値

  return (
    <StyledBubblesLayeredView
      surface={{
        leftTop: surfaceLeftTop,
      }}
      underground={{
        vanishingPoint: undergroundVanishingPoint,
      }}
      surfaceZIndex={zIndex - 2}
    >
      {/* 5つまで表示 */}
      {bubblesProcess.map((layer, layerIndex) => {
        return (
          <Fragment key={`layer-${layer[0]?.id}`}>
            {layer.map((bubble, xIndex) => {
              //同じレイヤーでは横に400ずつずらして並べている
              //const pos = new Vec2(surfaceLeftTop).add({ x: xIndex * 400, y: 0 });
              const bubbleXSizes = layer.map(
                (bubble) => bubble.size?.width || 400
              );
              //自分より前のコンポーネントのwidthを足す。
              const xPos = bubbleXSizes
                .slice(0, xIndex)
                .reduce((sum, w) => sum + w, 0);
              //同じレイヤーでは横にコンポーネントの大きさずつずらして並べる
              const pos = new Vec2(bubble.position).add(surfaceLeftTop);
              //違うレイヤーではどの方向にどれくらいずらすかの処理はBubbleViewの中のStyledBubbleで書かれている
              return (
                <BubbleView
                  bubble={bubble}
                  position={pos}
                  key={bubble.id}
                  layerIndex={layerIndex}
                  zIndex={100 - layerIndex}
                  //rect={rect}
                  vanishingPoint={undergroundVanishingPoint}
                  onCloseClick={(bubble) => {
                    props.onBubbleClose?.(bubble);
                  }}
                  onMoveClick={(bubble) => {
                    props.onBubbleMove?.(bubble);
                  }}
                  onLayerDownClick={(bubble) => {
                    props.onBubbleLayerDown?.(bubble);
                  }}
                  onLayerUpClick={(bubble) => {
                    props.onBubbleLayerUp?.(bubble);
                  }}
                >
                  <BubbleContent bubble={bubble} />
                </BubbleView>
              );
            })}
          </Fragment>
        );
      })}
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
  surface: {
    leftTop: Point2;
  };
  underground: {
    vanishingPoint?: Point2;
  };

  surfaceZIndex?: number; // surfaceのz-index

  children?: React.ReactNode;
};

const StyledBubblesLayeredView = styled.div<StyledBubblesLayeredViewProps>`
  width: 100vw;
  height: 100vh;
  position: relative;

  z-index: 0;

  overflow: hidden;

  > .e-underground-curtain {
    position: absolute;
    top: 0;
    left: 0;

    z-index: ${({ surfaceZIndex }) => surfaceZIndex || 0};

    width: 100%;
    height: 100%;
    //blur background
    backdrop-filter: blur(5px);
    pointer-events: none;
  }

  > .e-debug-visualizations {
    .e-surface-border {
      position: absolute;
      top: ${({ surface }) => surface?.leftTop?.y || 100}px;
      left: ${({ surface }) => surface?.leftTop?.x || 100}px;
      width: calc(100vw - ${({ surface }) => surface?.leftTop?.x || 100}px);
      height: calc(100vh - ${({ surface }) => surface?.leftTop?.y || 100}px);
      border: 5px solid red;
      pointer-events: none;
    }

    .e-underground-border {
    }
    .e-vanishing-point {
      position: absolute;
      top: ${({ underground }) => underground?.vanishingPoint?.y || 50}px;
      left: ${({ underground }) => underground?.vanishingPoint?.x || 50}px;
      width: 10px;
      height: 10px;
      background: blue;
      border-radius: 50%;
      pointer-events: none;
    }
  }
`;
