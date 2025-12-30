import { FC, useEffect, useMemo, useRef, useState, useContext } from "react";
import styled from "styled-components";
import { Bubble, Point2, Vec2 } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "../../PositionDebugger/domain/PositionDebuggerContext";
import { Box, IconButton, Stack, Menu, MenuItem } from "@mui/material";
import HighLightOffIcon from "@mui/icons-material/HighLightOff";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import { useMyRectObserver } from "../../01_Utils/01_useMyRect";
import { useAppDispatch } from "@bublys-org/state-management";
import { renderBubble, updateBubble } from "@bublys-org/bubbles-ui-state";
import { SmartRect } from "@bublys-org/bubbles-ui";
import { BubblesContext } from "../domain/BubblesContext";
//import { SmartRectView } from "../../PositionDebugger/ui/SmartRectView";

type BubbleProps = {
  bubble: Bubble;

  position?: Point2; // 位置を指定するためのオプション rectのほうが優先される
  vanishingPoint?: Point2; // バニシングポイントを指定するためのオプション

  layerIndex?: number;
  zIndex?: number;

  children?: React.ReactNode; // Bubbleか、Layoutか、Panelか。 Panelが最もベーシック
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; // クリックイベントハンドラ
  onCloseClick?: (bubble: Bubble) => void;
  onMove?: (bubble: Bubble) => void;
  onLayerDownClick?: (bubble: Bubble) => void;
  onLayerUpClick?: (bubble: Bubble) => void;
  onResize?: (bubble: Bubble) => void;
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
  onMove,
  onResize,
}) => {
  position = position || { x: 0, y: 0 };
  vanishingPoint = vanishingPoint || new Vec2({ x: 0, y: 0 });

  const vanishingPointRelative = useMemo(
    () => new Vec2(vanishingPoint).subtract(position),
    [vanishingPoint, position]
  );

  const { addRects } = usePositionDebugger();
  const dispatch = useAppDispatch();
  const { coordinateSystem, pageSize, surfaceLeftTop } = useContext(BubblesContext);

  const { ref, notifyRendered} = useMyRectObserver({ 
    onRectChanged: (rect: SmartRect) => {
      const updated = bubble.rendered(rect);
      dispatch(renderBubble(updated.toJSON()));

      addRects([rect])
    }
  });

  const [sizeMenuAnchor, setSizeMenuAnchor] = useState<null | HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartMouseRef = useRef<{ x: number; y: number } | null>(null);

  const endDrag = () => {
    dragStartPosRef.current = null;
    dragStartMouseRef.current = null;
    document.removeEventListener("mousemove", handleDragging);
    document.removeEventListener("mouseup", endDrag);
  };

  const handleDragging = (e: MouseEvent) => {
    if (!dragStartPosRef.current || !dragStartMouseRef.current) return;
    const deltaX = e.clientX - dragStartMouseRef.current.x;
    const deltaY = e.clientY - dragStartMouseRef.current.y;
    const newPos = {
      x: dragStartPosRef.current.x + deltaX,
      y: dragStartPosRef.current.y + deltaY,
    };

    dispatch(updateBubble(bubble.moveTo(newPos).toJSON()));
  };

  const handleSizeMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setSizeMenuAnchor(e.currentTarget);
  };

  const handleSizeMenuClose = () => {
    setSizeMenuAnchor(null);
  };

  const handleResizeClick = (width: number | null, height: number | null, newPosition?: Point2) => {
    let resizedBubble = width && height
      ? bubble.resizeTo({ width, height })
      : Bubble.fromJSON({ ...bubble.toJSON(), size: undefined });

    // 位置も変更する場合
    if (newPosition) {
      resizedBubble = resizedBubble.moveTo(newPosition);
    }

    dispatch(updateBubble(resizedBubble.toJSON()));
    onResize?.(resizedBubble);
    handleSizeMenuClose();
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLHeadingElement>) => {
    setIsFocused(true); // ヘッダークリックで最前面に
    if (!onMove) return;
    e.stopPropagation();
    dragStartPosRef.current = { ...bubble.position };
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", handleDragging);
    document.addEventListener("mouseup", endDrag);
  };

  const handleMouseLeave = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleDragging);
      document.removeEventListener("mouseup", endDrag);
    };
  }, []);

  return (
    <StyledBubble
      ref={ref}
      data-bubble-id={bubble.id}
      colorHue={bubble.colorHue}
      zIndex={isFocused ? 100 : zIndex}
      layerIndex={layerIndex}
      position={position}
      transformOrigin={vanishingPointRelative}
      onClick={onClick}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={notifyRendered}
      width={bubble.size ? `${bubble.size.width}px` : undefined}
      height={bubble.size ? `${bubble.size.height}px` : undefined}
    >
      <header className="e-bubble-header" onMouseDown={handleHeaderMouseDown}>
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <h1 className="e-bubble-name">{bubble.type}</h1>
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

            <IconButton
              size="small"
              sx={{
                backgroundColor: "white",
                padding: 0.5,
                "& .MuiSvgIcon-root": {
                  fontSize: "1.2rem",
                },
              }}
              onClick={handleSizeMenuOpen}
            >
              <AspectRatioIcon />
            </IconButton>


            {/* {onMoveClick && (
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
            )}  */}
          </Stack>

          <Menu
            anchorEl={sizeMenuAnchor}
            open={Boolean(sizeMenuAnchor)}
            onClose={handleSizeMenuClose}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => handleResizeClick(300, 200)}>小 (300x200)</MenuItem>
            <MenuItem onClick={() => handleResizeClick(500, 350)}>中 (500x350)</MenuItem>
            <MenuItem onClick={() => handleResizeClick(700, 500)}>大 (700x500)</MenuItem>
            <MenuItem onClick={() => {
              if (!pageSize) return;

              const globalCoordinateSystem = coordinateSystem;
              // 利用可能なスペース（グローバル座標系）
              const availableWidth = pageSize.width - globalCoordinateSystem.offset.x - surfaceLeftTop.x;
              const availableHeight = pageSize.height - globalCoordinateSystem.offset.y - surfaceLeftTop.y;

              // 位置をoffset分だけマイナス方向に
              const position = {
                x: 0,
                y: 0
              };

              handleResizeClick(availableWidth, availableHeight, position);
            }}>最大化</MenuItem>
            <MenuItem onClick={() => handleResizeClick(null, null)}>フィット (自動)</MenuItem>
          </Menu>
        </Box>
      </header>

      <main className="e-bubble-content">
        {/* 
        Type: {bubble.type}
        #{bubble.id}
        <br />
        <br /> */}
        {/* <div style={{backgroundColor: `hsl(${bubble.colorHue}, 50%, 50%)`}}></div>
        ({bubble?.position?.x},{bubble?.position?.y})<br />
        [{bubble.renderedRect?.width}x{bubble.renderedRect?.height}] */}
        {children}<br />
        {/* #{bubble.id} */}
      </main>

      {
        // bubble.renderedRect && (
        //   <SmartRectView rect={bubble.renderedRect} />
        // )
      }
      {/* {bubble.renderedRect && ( // デバッグ用矩形
        <div className="e-debug-rect"
          style={{ width: bubble.renderedRect.width  , height: bubble.renderedRect.height  }}>
        </div>
      )} */}

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

  max-height: 90vh;//FIXME:突貫対応

  background-color: hsla(${({ colorHue: color }) => color}, 50%, 50%, 0.5);

  border-radius: 3em;

  display: flex;
  flex-direction: column;

  >.e-bubble-header {
    cursor: move;
    user-select: none;

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
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 1em;
    font-size: 1em;
    background: transparent;

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
