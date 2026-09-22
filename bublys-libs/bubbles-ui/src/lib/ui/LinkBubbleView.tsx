import { FC } from "react";
import { Bubble } from "../Bubble.domain.js";
import { CoordinateSystem } from "@bublys-org/bubbles-ui-util";
import { getOriginRect, getDockedBubbleRect } from "../utils/get-origin-rect.js";
import { useBubbleRefsOptional } from "../context/BubbleRefsContext.js";
import { frustumBand } from "./link-band-path.js";

type LinkBubbleViewProps = {
  opener: Bubble;
  openee: Bubble;
  coordinateSystem: CoordinateSystem;
  linkZIndex: number;
  lightweightMode?: boolean;
  /** 見せるか。既定はホバー時だけなので、普段は透明にしておく（DOM は残す） */
  visible?: boolean;
};

export const LinkBubbleView: FC<LinkBubbleViewProps> = ({
  opener,
  openee,
  coordinateSystem,
  linkZIndex,
  lightweightMode = false,
  visible = true,
}) => {
  const bubbleRefs = useBubbleRefsOptional();

  // キャッシュ付きでorigin rectを取得（強制リフローを最小化）
  // useMemoは不要 - getOriginRectCachedが内部でキャッシュしている
  const originRect = bubbleRefs?.getOriginRectCached(openee.url)
    // フォールバック: 従来のgetOriginRectを使う
    ?? getOriginRect(opener.id, openee.url);

  // 岸に着いている opener は BubbleView が描かれず renderedRect が古いままなので、
  // クリック元が見つからなければ帯の要素を測る（浮いていれば undefined で素通り）
  const baseOpenerRect = originRect || getDockedBubbleRect(opener.id) || opener.renderedRect;
  const openerRect = baseOpenerRect
    ? baseOpenerRect.toLocal(coordinateSystem)
    : undefined;

  const openeeRect = openee.renderedRect
    ? openee.renderedRect.toLocal(coordinateSystem)
    : undefined;

  if (!openerRect || !openeeRect) return null;



  // 帯 = 起点（クリック元）が拡大されて openee になった錐台。
  // 4 頂点の同名対応と凸包で形が決まる（link-band-path）。一方が他方を含めば無し
  const band = frustumBand(openerRect, openeeRect);
  if (!band) return null;
  const pathData = band.path;

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
        opacity: visible ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    >
      <svg width="100%" height="100%">
        <path
          d={pathData}
          fill={
            lightweightMode
              ? "none"
              : opener.colorHue === undefined
                ? "rgba(255,0,0,0.5)"
                : `hsla(${opener.colorHue}, 50%, 50%, 0.3)`
          }
          stroke={
            lightweightMode
              ? opener.colorHue === undefined
                ? "rgba(255,0,0,0.7)"
                : `hsla(${opener.colorHue}, 50%, 50%, 0.7)`
              : "none"
          }
          strokeWidth={lightweightMode ? "1.5" : "0"}
        />
      </svg>
    </div>
  );
};
