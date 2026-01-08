import React, { FC, useMemo } from "react";
import { Bubble, CoordinateSystem, getOriginRect, getElementRect, SmartRect } from "@bublys-org/bubbles-ui";
import { useBubbleRefsOptional } from "../domain/BubbleRefsContext";

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
  const bubbleRefs = useBubbleRefsOptional();

  // Contextから参照を取得してrectを計算
  const originRect = useMemo(() => {
    // まずorigin要素（data-url）をContextから探す
    const originEl = bubbleRefs?.getOriginRef(openee.url);
    if (originEl) {
      const rect = getElementRect(originEl);
      const parentSize = { width: window.innerWidth, height: window.innerHeight };
      return new SmartRect(rect, parentSize, CoordinateSystem.GLOBAL.toData());
    }

    // Contextになければ、bubble要素内をquerySelectorで探す（フォールバック）
    const bubbleEl = bubbleRefs?.getBubbleRef(opener.id);
    if (bubbleEl) {
      const escapedUrl = CSS?.escape ? CSS.escape(openee.url) : openee.url;
      const selector = `[data-url="${escapedUrl}"]`;
      const originElInBubble = bubbleEl.querySelector(selector) as HTMLElement | null;
      if (originElInBubble) {
        const rect = getElementRect(originElInBubble);
        const parentSize = { width: window.innerWidth, height: window.innerHeight };
        return new SmartRect(rect, parentSize, CoordinateSystem.GLOBAL.toData());
      }
    }

    // それでもなければ従来のgetOriginRectを使う（最終フォールバック）
    return getOriginRect(opener.id, openee.url);
  }, [bubbleRefs, opener.id, openee.url]);

  const baseOpenerRect = originRect || opener.renderedRect;
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
