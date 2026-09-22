"use client";
import { FC, ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import type { Point2 } from "@bublys-org/bubbles-ui-util";
import type { Bubble } from "../Bubble.domain.js";
import { makeSelectShowreOrder } from "../state/bubbles-slice.js";
import { ShowreSide, isShowreSide, isVerticalShowre, nearestShowreSide } from "./Showre.domain.js";
import { ShowreView } from "./ShowreView.js";
import {
  SHOWRE_DOCK_THRESHOLD,
  ShowreDragContext,
  type FloatPreview,
  type ShowreDragContextType,
} from "./ShowreDragContext.js";

export type ShowreLayoutProps = {
  universeId: string;
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
  /** 海（浮いているバブルのサーフェス）。4 つの岸に囲まれて残りを埋める */
  children: ReactNode;
};

/**
 * 「岸 + 海」のレイアウト。1 つの universe の 4 辺に岸を置き、中央に海を置く。
 *
 * ルール「先に貼った岸が角を取る」: 岸は使われ始めた順（Showres.order）に外側から
 * 包む。例えば left → top の順なら
 *
 *   ┌──────┬────────────────┐
 *   │      │      top       │
 *   │ left ├────────────────┤
 *   │      │  海（children） │
 *   └──────┴────────────────┘
 *
 * root（画面の縁）でも入れ子のバブリ（バブルの縁）でも同じ規格。
 * 誰も着いていない岸は描かないので、岸を使わない universe は見た目が変わらない。
 *
 * 着岸・引き剥がしのドラッグはここが {@link ShowreDragContext} で支える:
 * 辺の判定（sideNear）と、ドラッグ中の「ここに着く」帯（previewSide）。
 */
export const ShowreLayout: FC<ShowreLayoutProps> = ({ universeId, renderBubbleContent, children }) => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const seaRef = useRef<HTMLDivElement>(null);
  const [previewSide, setPreviewSide] = useState<ShowreSide | null>(null);
  const [previewFloat, setPreviewFloat] = useState<FloatPreview | null>(null);
  const order = useAppSelector(makeSelectShowreOrder(universeId));

  /** この universe の帯（入れ子 universe の帯は除く） */
  const ownBars = useCallback((): HTMLElement[] => {
    const root = layoutRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-showre-side]")).filter(
      (bar) => bar.closest("[data-showre-layout]") === root,
    );
  }, []);

  const sideNear = useCallback((point: Point2): ShowreSide | undefined => {
    const root = layoutRef.current;
    if (!root) return undefined;
    // 1. 辺から近ければその岸。帯があるかどうかは問わない。
    //    帯の上に居ても別の辺に届いていればそちらが勝つ（幅いっぱいの上の帯の中を
    //    右端まで引きずったら「右」。帯の判定を先にすると帯から出られない）
    const rect = root.getBoundingClientRect();
    const local = { x: point.x - rect.left, y: point.y - rect.top };
    const nearest = nearestShowreSide(local, { width: rect.width, height: rect.height });
    const distance = {
      left: local.x,
      right: rect.width - local.x,
      top: local.y,
      bottom: rect.height - local.y,
    }[nearest];
    if (distance <= SHOWRE_DOCK_THRESHOLD) return nearest;
    // 2. 既にある帯の上ならその岸（帯が 24px より太いときの、帯の奥側）
    for (const bar of ownBars()) {
      const r = bar.getBoundingClientRect();
      if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) {
        const side = bar.dataset.showreSide;
        if (isShowreSide(side)) return side;
      }
    }
    return undefined;
  }, [ownBars]);

  const indexOnSide = useCallback((side: ShowreSide, point: Point2, excludeBubbleId?: string): number => {
    const root = layoutRef.current;
    if (!root) return 0;
    const bar = ownBars().find((b) => b.dataset.showreSide === side);
    if (!bar) return 0;
    const vertical = isVerticalShowre(side);
    let index = 0;
    for (const el of Array.from(bar.querySelectorAll<HTMLElement>("[data-docked-bubble-id]"))) {
      if (el.dataset.dockedBubbleId === excludeBubbleId) continue;
      const r = el.getBoundingClientRect();
      const center = vertical ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2;
      const p = vertical ? point.y : point.x;
      if (p > center) index += 1;
    }
    return index;
  }, [ownBars]);

  const seaElement = useCallback(
    () => seaRef.current?.querySelector<HTMLElement>("[data-bubble-universe]") ?? null,
    [],
  );

  /**
   * 予告帯の矩形（レイアウト要素基準）。
   * その岸に既に帯があるならその帯の矩形（そこに並ぶ）。無ければ新しく内側に生えるので、
   * 今の海の範囲に沿わせる。
   */
  const previewRect = (side: ShowreSide): React.CSSProperties | undefined => {
    const root = layoutRef.current;
    const sea = seaRef.current;
    if (!root || !sea) return undefined;
    const base = root.getBoundingClientRect();
    const existing = ownBars().find((b) => b.dataset.showreSide === side);
    const r = (existing ?? sea).getBoundingClientRect();
    const vertical = isVerticalShowre(side);
    return {
      top: r.top - base.top,
      left: r.left - base.left,
      ...(vertical
        ? { height: r.height, width: existing ? r.width : PREVIEW_THICKNESS, ...(side === "right" && !existing ? { left: r.right - base.left - PREVIEW_THICKNESS } : {}) }
        : { width: r.width, height: existing ? r.height : PREVIEW_THICKNESS, ...(side === "bottom" && !existing ? { top: r.bottom - base.top - PREVIEW_THICKNESS } : {}) }),
    };
  };

  /** 岸を order の順に外側から包む。先に貼った岸ほど外側 = 角を取る */
  const wrapWithShowres = (sides: readonly ShowreSide[], inner: ReactNode): ReactNode => {
    if (sides.length === 0) return inner;
    const [side, ...rest] = sides;
    const bar = <ShowreView universeId={universeId} side={side} renderBubbleContent={renderBubbleContent} />;
    const content = wrapWithShowres(rest, inner);
    const before = side === "top" || side === "left";
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isVerticalShowre(side) ? "row" : "column",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {before ? bar : content}
        {before ? content : bar}
      </div>
    );
  };

  const dragContext = useMemo<ShowreDragContextType>(
    () => ({
      universeId,
      layoutRef,
      previewSide,
      setPreviewSide,
      previewFloat,
      setPreviewFloat,
      sideNear,
      indexOnSide,
      seaElement,
    }),
    [universeId, previewSide, previewFloat, sideNear, indexOnSide, seaElement],
  );

  /** 引き剥がしの予告矩形（海の要素基準）。海の外なら描かない */
  const floatGhostStyle = (preview: FloatPreview): React.CSSProperties | undefined => {
    const sea = seaRef.current;
    if (!sea) return undefined;
    const r = sea.getBoundingClientRect();
    const inSea =
      preview.point.x >= r.left && preview.point.x <= r.right &&
      preview.point.y >= r.top && preview.point.y <= r.bottom;
    if (!inSea) return undefined;
    return {
      left: preview.point.x - r.left,
      top: preview.point.y - r.top,
      width: preview.size.width,
      height: preview.size.height,
    };
  };

  return (
    <ShowreDragContext.Provider value={dragContext}>
      <div
        ref={layoutRef}
        data-showre-layout={universeId}
        style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", position: "relative" }}
      >
        {wrapWithShowres(
          order,
          <div ref={seaRef} style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
            {children}
            {/* ドラッグ中の「ここに浮く」矩形（海の中に置くので岸の帯には被らない） */}
            {previewFloat && <FloatPreviewGhost style={floatGhostStyle(previewFloat)} />}
          </div>,
        )}

        {/* ドラッグ中の「ここに着く」帯 */}
        {previewSide && <DockPreviewBand side={previewSide} rect={previewRect(previewSide)} />}
      </div>
    </ShowreDragContext.Provider>
  );
};

const PREVIEW_THICKNESS = 56;

const FloatPreviewGhost: FC<{ style?: React.CSSProperties }> = ({ style }) => {
  if (!style) return null;
  return (
    <div
      data-showre-float-preview=""
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 2000,
        boxSizing: "border-box",
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        border: "2px dashed rgba(255, 255, 255, 0.7)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        ...style,
      }}
    />
  );
};

const DockPreviewBand: FC<{ side: ShowreSide; rect?: React.CSSProperties }> = ({ side, rect }) => {
  const vertical = isVerticalShowre(side);
  const style: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    zIndex: 2000,
    backgroundColor: "rgba(126, 155, 212, 0.25)",
    border: "2px dashed rgba(126, 155, 212, 0.9)",
    boxSizing: "border-box",
    // 矩形が測れないときのフォールバック（辺いっぱい）
    ...(vertical
      ? { top: 0, bottom: 0, width: PREVIEW_THICKNESS, [side]: 0 }
      : { left: 0, right: 0, height: PREVIEW_THICKNESS, [side]: 0 }),
    ...(rect ?? {}),
  };
  return <div data-showre-preview={side} style={style} />;
};
