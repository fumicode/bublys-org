import { FC, useContext } from "react";
import { Bubble } from "../Bubble.domain.js";
import { CoordinateSystem, SmartRect } from "@bublys-org/bubbles-ui-util";
import { getOriginRect } from "../utils/get-origin-rect.js";
import { useBubbleRefsOptional } from "../context/BubbleRefsContext.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";

type LinkBubbleViewProps = {
  opener: Bubble;
  openee: Bubble;
  coordinateSystem: CoordinateSystem;
  linkZIndex: number;
};

/**
 * screen-within-container 座標（getBoundingClientRect - containerOffset）を
 * canvas 座標（CSS transform の逆変換）に変換する。
 *
 * 変換式: canvasX = (localX - panX) / zoom
 *
 * getBoundingClientRect は CSS transform を含む screen 座標を返すため、
 * canvas の transform（translate + scale）の逆変換が必要。
 */
const toCanvasRect = (rect: SmartRect, panX: number, panY: number, zoom: number): SmartRect => {
  return new SmartRect(
    new DOMRect(
      (rect.x - panX) / zoom,
      (rect.y - panY) / zoom,
      rect.width / zoom,
      rect.height / zoom,
    ),
    rect.parentSize,
    rect.coordinateSystem,
  );
};

export const LinkBubbleView: FC<LinkBubbleViewProps> = ({
  opener,
  openee,
  coordinateSystem,
  linkZIndex,
}) => {
  const bubbleRefs = useBubbleRefsOptional();
  const { canvasZoomRef, canvasPanRef } = useContext(BubblesContext);

  // キャッシュ付きでorigin rectを取得（強制リフローを最小化）
  const originRect = bubbleRefs?.getOriginRectCached(openee.url)
    // フォールバック: 従来のgetOriginRectを使う
    ?? getOriginRect(opener.id, openee.url);

  const baseOpenerRect = originRect || opener.renderedRect;

  // toLocal で「screen-within-container」座標に変換し、さらに canvas 逆変換を適用
  const canvasZoom = canvasZoomRef?.current ?? 1;
  const canvasPan = canvasPanRef?.current ?? { x: 0, y: 0 };

  const rawOpenerRect = baseOpenerRect
    ? baseOpenerRect.toLocal(coordinateSystem)
    : undefined;

  const rawOpeneeRect = openee.renderedRect
    ? openee.renderedRect.toLocal(coordinateSystem)
    : undefined;

  if (!rawOpenerRect || !rawOpeneeRect) return null;

  // canvas 座標系へ逆変換
  const openerRect = toCanvasRect(rawOpenerRect, canvasPan.x, canvasPan.y, canvasZoom);
  const openeeRect = toCanvasRect(rawOpeneeRect, canvasPan.x, canvasPan.y, canvasZoom);

  //A 〜 B
  //|    |
  //C 〜 D

  const topControlX = (openerRect.x + openeeRect.x) / 2;
  const bottomControlX = (openerRect.left + openeeRect.left) / 2;

  const pathData = [
    //A: 起点
    `M ${openerRect.x} ${openerRect.y}`,
    //B: ベジェ曲線で終点へ
    `C ${topControlX} ${openerRect.y} ${topControlX} ${openeeRect.y} ${openeeRect.x} ${openeeRect.y}`,
    //D: 直線で終点の下へ
    `L ${openeeRect.left} ${openeeRect.bottom}`,
    //C: ベジェ曲線で起点の下へ
    `C ${bottomControlX} ${openeeRect.bottom} ${bottomControlX} ${openerRect.bottom} ${openerRect.left} ${openerRect.bottom}`,
    "Z",
  ].join(" ");

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: linkZIndex,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        // SVGのoverflow:visibleを有効にするため、親divもvisibleにする
        overflow: "visible",
      }}
    >
      {/* overflow: visible でキャンバス境界外のパスもクリップしない */}
      <svg width="100%" height="100%" style={{ overflow: "visible" }}>
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
        <path
          d={pathData}
          stroke="none"
          strokeWidth="2"
          fill={
            opener.colorHue === undefined
              ? "rgba(255,0,0,0.5)"
              : `hsla(${opener.colorHue}, 50%, 50%, 0.3)`
          }
        />
      </svg>
    </div>
  );
};
