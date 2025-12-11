import React, { FC } from "react";
import { Bubble, CoordinateSystem, SmartRect, GLOBAL_COORDINATE_SYSTEM } from "@bublys-org/bubbles-ui";

type LinkBubbleViewProps = {
  opener: Bubble;
  openee: Bubble;
  coordinateSystem: CoordinateSystem;
  linkZIndex: number;
};

export const LinkBubbleView: FC<LinkBubbleViewProps> = ({
  opener,
  openee,
  coordinateSystem,
  linkZIndex,
}) => {
  const domOpenerRect = getOpenerRectForRelation(opener, openee.name);
  const baseOpenerRect = domOpenerRect || opener.renderedRect;
  const openerRect = baseOpenerRect
    ? baseOpenerRect.toLocal(coordinateSystem)
    : undefined;

  const openeeRect = openee.renderedRect
    ? openee.renderedRect.toLocal(coordinateSystem)
    : undefined;

  if (!openerRect || !openeeRect) return null;



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
      }}
    >
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

/**
 * 複数のDOMRectをマージして、それらを包含する最小の矩形を返す
 */
const mergeDOMRects = (rects: DOMRect[]): DOMRect => {
  if (rects.length === 0) {
    return new DOMRect(0, 0, 0, 0);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};

/**
 * 要素のBoundingClientRectを取得する
 * display:contentsの要素の場合は、直接の子要素すべてのrectをマージして返す
 */
const getElementRect = (element: HTMLElement): DOMRect => {
  const style = window.getComputedStyle(element);

  if (style.display === 'contents') {
    // display:contentsの場合、直接の子要素のrectをすべて取得してマージ
    const childRects: DOMRect[] = [];
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as HTMLElement;
      childRects.push(child.getBoundingClientRect());
    }
    return mergeDOMRects(childRects);
  }

  return element.getBoundingClientRect();
};

const getOpenerRectForRelation = (
  openerBubble: Bubble,
  detailName: string
): SmartRect | undefined => {
  if (typeof document === "undefined") return undefined;

  const escapedName = CSS?.escape ? CSS.escape(detailName) : detailName;
  const selector = `[data-url="${escapedName}"]`;

  const openerContainer = document.querySelector(
    `[data-bubble-id="${openerBubble.id}"]`
  ) as HTMLElement | null;

  const openerEl = openerContainer
    ? (openerContainer.querySelector(selector) as HTMLElement | null)
    : (document.querySelector(selector) as HTMLElement | null);

  if (!openerEl) return undefined;

  const rect = getElementRect(openerEl);
  const parentSize = { width: window.innerWidth, height: window.innerHeight };

  return new SmartRect(rect, parentSize, GLOBAL_COORDINATE_SYSTEM);
};
