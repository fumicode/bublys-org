import React, { FC } from "react";
import { Bubble, CoordinateSystem, getOriginRect } from "@bublys-org/bubbles-ui";
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

  // キャッシュ付きでorigin rectを取得（強制リフローを最小化）
  // useMemoは不要 - getOriginRectCachedが内部でキャッシュしている
  const originRect = bubbleRefs?.getOriginRectCached(openee.url)
    // フォールバック: 従来のgetOriginRectを使う
    ?? getOriginRect(opener.id, openee.url);

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

  // 全体の形状（fill用）
  const fillPath = [
    `M ${openerRect.x} ${openerRect.y}`,
    `C ${topControlX} ${openerRect.y} ${topControlX} ${openeeRect.y} ${openeeRect.x} ${openeeRect.y}`,
    `L ${openeeRect.left} ${openeeRect.bottom}`,
    `C ${bottomControlX} ${openeeRect.bottom} ${bottomControlX} ${openerRect.bottom} ${openerRect.left} ${openerRect.bottom}`,
    "Z",
  ].join(" ");

  // 上の曲線（A→B）
  const topCurvePath = [
    `M ${openerRect.x} ${openerRect.y}`,
    `C ${topControlX} ${openerRect.y} ${topControlX} ${openeeRect.y} ${openeeRect.x} ${openeeRect.y}`,
  ].join(" ");

  // 下の曲線（D→C）
  const bottomCurvePath = [
    `M ${openeeRect.left} ${openeeRect.bottom}`,
    `C ${bottomControlX} ${openeeRect.bottom} ${bottomControlX} ${openerRect.bottom} ${openerRect.left} ${openerRect.bottom}`,
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
        {/* 全体の塗り（ストロークなし） */}
        <path
          d={fillPath}
          stroke="none"
          fill={
            opener.colorHue === undefined
              ? "rgba(255,0,0,0.05)"
              : `hsla(${opener.colorHue}, 50%, 50%, 0.05)`
          }
        />
        {/* 上の曲線（白ストローク） */}
        <path
          d={topCurvePath}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* 下の曲線（白ストローク、薄め） */}
        <path
          d={bottomCurvePath}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
};
