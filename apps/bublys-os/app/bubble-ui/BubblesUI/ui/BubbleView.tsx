import { FC, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2 } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "../../PositionDebugger/domain/PositionDebuggerContext";
import { Box, IconButton, Stack } from "@mui/material";
import HighLightOffIcon from "@mui/icons-material/HighLightOff";
import MoveDownIcon from "@mui/icons-material/MoveDown";
import MoveUpIcon from "@mui/icons-material/MoveUp";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import { useMyRect } from "../../01_Utils/01_useMyRect";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { renderBubble, selectRenderCount } from "@bublys-org/bubbles-ui-state";
import SmartRect from "../domain/01_SmartRect";
import { useWindowSize } from "../../01_Utils/01_useWindowSize";

type BubbleProps = {
  bubble: Bubble;

  position?: Point2; // 位置を指定するためのオプション rectのほうが優先される
  vanishingPoint?: Point2; // バニシングポイントを指定するためのオプション

  layerIndex?: number;
  zIndex?: number;

  children?: React.ReactNode; // Bubbleか、Layoutか、Panelか。 Panelが最もベーシック
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; // クリックイベントハンドラ
  onCloseClick?: (bubble: Bubble) => void;
  onMoveClick?: (bubble: Bubble) => void;
  onLayerDownClick?: (bubble: Bubble) => void;
  onLayerUpClick?: (bubble: Bubble) => void;
};

export const BubbleView: FC<BubbleProps> = ({
  bubble,
  children,
  layerIndex,
  zIndex,
  position,
  vanishingPoint,
  onClick,
  onCloseClick,
  onLayerDownClick,
  onLayerUpClick,
  onMoveClick,
}) => {
  position = position || { x: 0, y: 0 };
  vanishingPoint = vanishingPoint || new Vec2({ x: 0, y: 0 });

  const vanishingPointRelative = useMemo(
    () => new Vec2(vanishingPoint).subtract(position),
    [vanishingPoint, position]
  );

  const { addPoints, addRects } = usePositionDebugger();


  const { ref, handleTransitionEnd } = useMyRect({ bubble });





  

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 100); // 遅延時間
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <StyledBubble
      ref={ref}
      colorHue={bubble.colorHue}
      zIndex={isHovered ? 100 : zIndex} // ホバー時に最前面に
      layerIndex={layerIndex}
      position={position}
      transformOrigin={vanishingPointRelative}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={handleTransitionEnd}>
      <header className="e-bubble-header">
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <h1 className="e-bubble-name">{bubble.name}</h1>
          <Stack
            direction="row"
            spacing={0} // 間隔をさらに詰める（デフォルトは1）
            sx={{
              position: "absolute",
              left: 0,
              top: "60%",
              transform: "translateY(-50%)",
              marginLeft: 0.5,
            }}
          >
            {onCloseClick && (
              <IconButton
                size="small" // サイズをsmallに変更
                sx={{
                  backgroundColor: "white",
                  padding: 0.5, // パディングを小さく（デフォルトは1）
                  "& .MuiSvgIcon-root": {
                    fontSize: "1.2rem", // アイコンサイズを小さく（デフォルトは1.5rem）
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseClick?.(bubble);
                }}
              >
                <HighLightOffIcon />
              </IconButton>
            )}
            {onMoveClick && (
              <IconButton
                size="small"
                sx={{
                  backgroundColor: "white",
                  padding: 0.5,
                  "& .MuiSvgIcon-root": {
                    fontSize: "1.2rem",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveClick?.(bubble);
                }}
              >
                <VerticalAlignTopIcon />
              </IconButton>
            )}
            {onLayerDownClick && (
              <IconButton
                size="small"
                sx={{
                  backgroundColor: "white",
                  padding: 0.5,
                  "& .MuiSvgIcon-root": {
                    fontSize: "1.2rem",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerDownClick?.(bubble);
                }}
              >
                <MoveDownIcon />
              </IconButton>
            )}
            {onLayerUpClick && (
              <IconButton
                sx={{
                  backgroundColor: "white",
                  padding: 0.5,
                  "& .MuiSvgIcon-root": {
                    fontSize: "1.2rem",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerUpClick?.(bubble);
                }}
              >
                <MoveUpIcon />
              </IconButton>
            )}
          </Stack>
        </Box>
      </header>

      <main className="e-bubble-content">
        {/* #{bubble.id}
        <br />
        Type: {bubble.type}
        <br /> */}
        [{bubble.renderedRect?.width}x{bubble.renderedRect?.height}]
        {children}#{bubble.id}({bubble?.position?.x},{bubble?.position?.y})
        [{bubble.size?.width}x{bubble.size?.height}]
      </main>

      {bubble.renderedRect && (
        <div className="e-debug-rect"
          style={{ width: bubble.renderedRect.width  , height: bubble.renderedRect.height  }}>
        </div>
      )}
    </StyledBubble>
  );
};

//div のpropsに合わせて
type StyledBubbleProp = React.HTMLAttributes<HTMLDivElement> & {
  position?: Point2; // 位置を指定するためのオプション
  layerIndex?: number; // レイヤーのインデックス = zIndex * -1
  zIndex?: number; // = - layerIndex

  transformOrigin?: Vec2; // バニシングポイントを基準に変形するためのオプション

  colorHue: number;
  width?: string; // 幅を指定するためのオプション
  height?: string; // 高さを指定するためのオプション

  ref: React.RefObject<HTMLDivElement | null>;
};

const StyledBubble = styled.div<StyledBubbleProp>`
  position: absolute;

  width: ${({ width }) => (width ? width : "fit-content")};
  height: ${({ height }) => (height ? height : "auto")};

  z-index: ${({ zIndex }) => (zIndex !== undefined ? zIndex : 0)};

  left: ${({ position }) => (position ? `${position.x}px` : "0")};
  top: ${({ position }) => (position ? `${position.y}px` : "0")};

  transition-property: left top transform;
  transition: 0.3s ease-in-out;

  transform-origin: ${({ transformOrigin }) =>
    transformOrigin
      ? `${transformOrigin.x}px ${transformOrigin.y}px`
      : "center center"};

  // ここで奥のレイヤーほどスケールを小さくしている。
  transform: scale(
    ${({ layerIndex }) => (layerIndex !== undefined ? 1 - layerIndex * 0.1 : 1)}
  );

  background-color: hsla(${({ colorHue: color }) => color}, 50%, 50%, 0.5);

  border-radius: 3em;

  >.e-bubble-header {
    .e-bubble-name {
      background: hsla(0, 0%, 100%, 0.5);
      padding: 0.5em;
      border-radius: 0.5em;
      font-size: 1.2em;
      font-weight: bold;
      text-align: center;
      margin: 0;
      color: hsla(0, 0%, 0%, 0.8);
    }
  }

  >.e-bubble-content {
    padding: 1em;
    font-size: 1em;
    background: white;

    border-radius: 0.5em;
    margin: 0.5em;
  }

  >.e-debug-rect {
    //下中央
    display: flex;
    justify-content: center;
    align-items: end;

    border-radius: 30px;

    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border: 1px solid blue;
    pointer-events: none;
    box-sizing: border-box;
    
  }
`;

