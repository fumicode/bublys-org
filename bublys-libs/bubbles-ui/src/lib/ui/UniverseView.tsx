"use client";
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector, selectWindowSize } from "@bublys-org/state-management";
import { CoordinateSystem, Layer } from "@bublys-org/bubbles-ui-util";
import { nameIntent } from "@bublys-org/world-line-graph";
import { Bubble, createBubble } from "../Bubble.domain.js";
import { BubblesContext, type OpenBubbleOptions } from "../bubble-routing/BubbleRouting.js";
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
  buildSeedArrangement,
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
    nameIntent("seed");
    dispatch(replaceBubbleArrangement(buildSeedArrangement(initialBubbleUrls), universeId));
    // 初回・空のときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popChild = useCallback(
    (
      b: Bubble,
      openerBubbleId: string,
      openingPosition: OpeningPosition = "bubble-side-right",
      options?: OpenBubbleOptions,
    ): string => {
      // 動詞は「いま開いている意図に名前を付ける」だけ。区間を閉じはしない
      nameIntent(`open:${b.url}`);
      dispatch(addBubble(b.toJSON(), universeId));
      dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }, universeId));
      dispatch(
        popChildInProcess({ bubbleId: b.id, openingPosition, droppedAt: options?.droppedAt }, universeId),
      );
      return b.id;
    },
    [dispatch, universeId],
  );

  const joinSibling = useCallback(
    (b: Bubble, openerBubbleId: string, options?: OpenBubbleOptions): string => {
      nameIntent(`open:${b.url}`);
      dispatch(addBubble(b.toJSON(), universeId));
      dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }, universeId));
      dispatch(joinSiblingInProcess({ bubbleId: b.id, droppedAt: options?.droppedAt }, universeId));
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
    (
      name: string,
      openerBubbleId: string,
      openingPosition: OpeningPosition = "bubble-side-right",
      options?: OpenBubbleOptions,
    ): string => {
      const newBubble = createBubble(name);
      // 落として開くときも、レイヤーの決まりは他と同じ。
      // 同じ種類のバブルなら今のレイヤーに並べ、違う種類なら新しいレイヤーを作る。
      // 落とした操作が変えるのは「どこに置くか」だけで、「どのレイヤーか」は変えない。
      // （履歴の下部ストリップだけは位置の決まりなので、落とした場所が勝つ）
      if (openingPosition === "dropped-place") {
        return surfaceBubbles?.[0]?.type === newBubble.type
          ? joinSibling(newBubble, openerBubbleId, options)
          : popChild(newBubble, openerBubbleId, openingPosition, options);
      }
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
      nameIntent(`close:${b.type}`);
      dispatch(deleteProcessBubble(b.id, universeId));
      dispatch(removeBubble(b.id, universeId));
    },
    [dispatch, universeId],
  );

  const layerDown = useCallback(
    (b: Bubble) => {
      nameIntent("layer:down");
      dispatch(layerDownAction(b.id, universeId));
    },
    [dispatch, universeId],
  );
  const layerUp = useCallback(
    (b: Bubble) => {
      nameIntent("layer:up");
      dispatch(layerUpAction(b.id, universeId));
    },
    [dispatch, universeId],
  );

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
