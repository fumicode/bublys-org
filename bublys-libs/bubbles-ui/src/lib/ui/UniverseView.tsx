"use client";
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector, selectWindowSize } from "@bublys-org/state-management";
import { CoordinateSystem, Layer } from "@bublys-org/bubbles-ui-util";
import { Bubble, createBubble } from "../Bubble.domain.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { BubbleRefsProvider } from "../context/BubbleRefsContext.js";
import { BubblesLayeredView } from "./BubblesLayeredView.js";
import { measureViewportForElement } from "../utils/measure-viewport.js";
import {
  makeSelectBubbleLayers,
  makeSelectSurfaceBubbles,
  makeSelectGlobalCoordinateSystem,
  makeSelectSurfaceLeftTop,
  addBubble,
  relateBubbles,
  popChildInProcess,
  popChildMaxInProcess,
  joinSiblingInProcess,
  deleteProcessBubble,
  removeBubble,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
  setGlobalCoordinateSystem,
  replaceBubbleArrangement,
  type OpeningPosition,
  type BubbleArrangementState,
} from "../state/index.js";

export type UniverseViewProps = {
  /** この universe の ID（root or ネストのパス） */
  universeId: string;
  /** バブル中身のレンダラ（ルート解決を注入） */
  renderBubbleContent?: (bubble: Bubble) => ReactNode;
  /** universe が空のとき最初に置くバブルの URL 群（ネスト universe の種） */
  initialBubbleUrls?: string[];
};

/**
 * 1つの universe を描画する自己完結コンポーネント。
 * universeId に束ねた orchestration（popChild/joinSibling/レイヤー操作など）+
 * BubblesLayeredView をまとめる。
 *
 * バブルの中身として再帰的に置くことで「バブルの中の universe」を実現する。
 */
export const UniverseView: FC<UniverseViewProps> = ({
  universeId,
  renderBubbleContent,
  initialBubbleUrls,
}) => {
  const dispatch = useAppDispatch();
  // この universe の DOM 要素を引くためのラッパ ref（下部ストリップ計測用）
  const rootRef = useRef<HTMLDivElement>(null);
  const bubbleLayers = useAppSelector(makeSelectBubbleLayers(universeId));
  const surfaceBubbles = useAppSelector(makeSelectSurfaceBubbles(universeId));
  const globalCoordinateSystem = useAppSelector(makeSelectGlobalCoordinateSystem(universeId));
  const surfaceLeftTop = useAppSelector(makeSelectSurfaceLeftTop(universeId));
  const pageSize = useAppSelector(selectWindowSize);

  // 空ならシード（ネスト universe に最初のバブルを置く）
  useEffect(() => {
    if (bubbleLayers.length > 0) return;
    if (!initialBubbleUrls?.length) return;
    const bubbles: BubbleArrangementState["bubbles"] = {};
    const layers: string[][] = [];
    initialBubbleUrls.forEach((url, i) => {
      const b = createBubble(url, { x: i * 400, y: 0 });
      bubbles[b.id] = b.toJSON();
      layers.push([b.id]);
    });
    dispatch(replaceBubbleArrangement({ bubbles, bubbleRelations: [], process: { layers } }, universeId));
    // 初回・空のときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popChild = useCallback(
    (b: Bubble, openerBubbleId: string, openingPosition: OpeningPosition = "right-side"): string => {
      dispatch(addBubble(b.toJSON(), universeId));
      dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }, universeId));
      dispatch(popChildInProcess({ bubbleId: b.id, openingPosition }, universeId));
      return b.id;
    },
    [dispatch, universeId],
  );

  const joinSibling = useCallback(
    (b: Bubble, openerBubbleId: string): string => {
      dispatch(addBubble(b.toJSON(), universeId));
      dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }, universeId));
      dispatch(joinSiblingInProcess(b.id, universeId));
      return b.id;
    },
    [dispatch, universeId],
  );

  // この universe（入れ子の窓）の可視領域の「下部」に、左右いっぱいのストリップとして開く。
  // measureViewport は root を測ってしまうので、この universe の DOM 要素を基準にする
  // measureViewportForElement を使う。maximize ではなく resizeTo（明示サイズ）で開く。
  const popChildViewPortBelow = useCallback(
    (b: Bubble, openerBubbleId: string): string => {
      const universeEl = rootRef.current?.querySelector<HTMLElement>("[data-bubble-universe]") ?? null;
      const viewport = measureViewportForElement(universeEl);
      const surfaceLayer = new Layer(0, surfaceLeftTop, globalCoordinateSystem.vanishingPoint);
      const visible = viewport?.visibleRegion() ?? {
        origin: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
      };

      const availableWidth = visible.size.width - surfaceLayer.surfaceOrigin.x;
      const availableHeight = visible.size.height - surfaceLayer.surfaceOrigin.y;
      const height = Math.round(availableHeight * 0.45);
      const newPosition = {
        x: visible.origin.x,
        y: visible.origin.y + (availableHeight - height),
      };

      const resizedBubble = b.resizeTo({ width: availableWidth, height });
      const movedBubble = resizedBubble.moveTo(newPosition);

      dispatch(addBubble(movedBubble.toJSON(), universeId));
      dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: movedBubble.id }, universeId));
      // popChildMaxInProcess を再利用（前面化＋アニメのみ。再配置リスナーは走らない）。
      dispatch(popChildMaxInProcess(b.id, universeId));
      return b.id;
    },
    [dispatch, universeId, surfaceLeftTop, globalCoordinateSystem],
  );

  const openBubble = useCallback(
    (name: string, openerBubbleId: string, openingPosition: OpeningPosition = "right-side"): string => {
      const newBubble = createBubble(name);
      // 履歴は画面（この universe）下部の左右いっぱいストリップで開く
      if (/\/history$/.test(name)) {
        return popChildViewPortBelow(newBubble, openerBubbleId);
      }
      if (surfaceBubbles?.[0]?.type === newBubble.type) {
        return joinSibling(newBubble, openerBubbleId);
      }
      return popChild(newBubble, openerBubbleId, openingPosition);
    },
    [surfaceBubbles, popChild, joinSibling, popChildViewPortBelow],
  );

  const deleteBubble = useCallback(
    (b: Bubble) => {
      dispatch(deleteProcessBubble(b.id, universeId));
      dispatch(removeBubble(b.id, universeId));
    },
    [dispatch, universeId],
  );

  const layerDown = useCallback((b: Bubble) => dispatch(layerDownAction(b.id, universeId)), [dispatch, universeId]);
  const layerUp = useCallback((b: Bubble) => dispatch(layerUpAction(b.id, universeId)), [dispatch, universeId]);

  const handleCoordinateSystemReady = useCallback(
    (cs: CoordinateSystem) => dispatch(setGlobalCoordinateSystem(cs.toData(), universeId)),
    [dispatch, universeId],
  );

  const bubblesContextValue = useMemo(
    () => ({ pageSize, surfaceLeftTop, coordinateSystem: globalCoordinateSystem, openBubble }),
    [pageSize, surfaceLeftTop, globalCoordinateSystem, openBubble],
  );

  return (
    <BubblesContext.Provider value={bubblesContextValue}>
      <BubbleRefsProvider>
        <div ref={rootRef} style={{ width: "100%", height: "100%" }}>
          <BubblesLayeredView
            universeId={universeId}
            bubbleLayers={bubbleLayers}
            vanishingPoint={globalCoordinateSystem.vanishingPoint}
            renderBubbleContent={renderBubbleContent}
            onBubbleClose={deleteBubble}
            onBubbleLayerDown={layerDown}
            onBubbleLayerUp={layerUp}
            onCoordinateSystemReady={handleCoordinateSystemReady}
          />
        </div>
      </BubbleRefsProvider>
    </BubblesContext.Provider>
  );
};
