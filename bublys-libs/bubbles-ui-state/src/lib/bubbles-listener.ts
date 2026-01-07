import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  popChildInProcess,
  popChildMaxInProcess,
  removeBubble,
  renderBubble,
  selectBubble,
  selectBubblesRelationByOpeneeId,
  selectSurfaceBubbles,
  updateBubble,
  selectGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  clearAllAnimations,
} from './bubbles-slice.js';
import { convertGlobalPointToLayerLocal, getOriginRect } from '@bublys-org/bubbles-ui';

// Listener ミドルウェアを定義
export const bubblesListener = createListenerMiddleware();

// フォールバックタイマー（onTransitionEndが発火しなかった場合の保険）
let animationFallbackTimer: ReturnType<typeof setTimeout> | null = null;
const ANIMATION_FALLBACK_DURATION = 350; // CSSトランジション(300ms)より少し長め

const scheduleAnimationFallback = (dispatch: (action: ReturnType<typeof clearAllAnimations>) => void) => {
  if (animationFallbackTimer) {
    clearTimeout(animationFallbackTimer);
  }
  animationFallbackTimer = setTimeout(() => {
    dispatch(clearAllAnimations());
    animationFallbackTimer = null;
  }, ANIMATION_FALLBACK_DURATION);
};

// joinSiblingInProcess 発火後、moveTo → updateBubble を実行
// 兄弟バブルのrenderedRectがすでにあれば、renderBubbleを待たずに即座に位置を計算
bubblesListener.startListening({
  actionCreator: joinSiblingInProcess,
  effect: async (action, listenerApi) => {
    const id = (action as ReturnType<typeof joinSiblingInProcess>).payload;

    const state = listenerApi.getState() as any;
    const surfaceBubbles = selectSurfaceBubbles(state);
    const otherSiblingBubbles = surfaceBubbles.filter(b => b.id !== id);

    if (!otherSiblingBubbles.length) {
      console.log("JoinSibling: No other siblings, skipping positioning");
      return;
    }

    const thisBubble = selectBubble(state, { id });

    // 最後の兄弟バブル（最も右にあると想定）を基準にする
    const brotherBubble = otherSiblingBubbles[otherSiblingBubbles.length - 1];
    const brotherRect = brotherBubble.renderedRect;

    // 兄弟バブルのrenderedRectがあれば、即座に位置を計算
    if (brotherRect) {
      console.log("JoinSibling: Calculating position immediately (no render wait)");

      // 兄弟の隣に配置すべき位置を計算（グローバル座標）
      // サイズが不明な場合は兄弟バブルのサイズを使う（類似サイズと仮定）
      const estimatedSize = thisBubble.renderedRect?.size || brotherRect.size;
      const globalPoint = brotherRect.calcPositionForSibling(estimatedSize);
      console.log("JoinSibling: Calculated position (global)", globalPoint);

      if (!globalPoint) {
        return;
      }

      // グローバル座標系の設定を取得
      const coordinateConfig = selectGlobalCoordinateSystem(state);
      const surfaceLeftTop = selectSurfaceLeftTop(state);

      // グローバル座標をトップレイヤーのローカル座標に変換
      const relativePoint = convertGlobalPointToLayerLocal(
        globalPoint,
        0, // joinSiblingはトップレイヤー（surface）に配置される
        coordinateConfig,
        surfaceLeftTop
      );

      console.log("JoinSibling: Converted to layer-local point", relativePoint);

      const moved = thisBubble.moveTo(relativePoint);

      // バブルを更新
      listenerApi.dispatch(updateBubble(moved.toJSON()));
      return;
    }

    // フォールバック: 兄弟バブルのrenderedRectがない場合は従来通りrenderを待つ
    console.log("JoinSibling: Waiting for render (fallback)");

    await listenerApi.take(
      (otherAction): otherAction is ReturnType<typeof renderBubble> => {
        const oa = otherAction as ReturnType<typeof renderBubble>;
        return oa.type === renderBubble.type && oa.payload.id === id;
      }
    );

    const newState = listenerApi.getState() as any;
    const newThisBubble = selectBubble(newState, { id });
    const newSurfaceBubbles = selectSurfaceBubbles(newState);
    const newOtherSiblings = newSurfaceBubbles.filter(b => b.id !== id);

    if (!newOtherSiblings.length) {
      return;
    }

    const newBrotherBubble = newOtherSiblings[newOtherSiblings.length - 1];
    const newBrotherRect = newBrotherBubble.renderedRect;

    if (!newBrotherRect) {
      console.log("JoinSibling: Brother bubble has no renderedRect");
      return;
    }

    const estimatedSize = newThisBubble.renderedRect?.size || newBrotherRect.size;
    const globalPoint = newBrotherRect.calcPositionForSibling(estimatedSize);

    if (!globalPoint) {
      return;
    }

    const coordinateConfig = selectGlobalCoordinateSystem(newState);
    const surfaceLeftTop = selectSurfaceLeftTop(newState);

    const relativePoint = convertGlobalPointToLayerLocal(
      globalPoint,
      0,
      coordinateConfig,
      surfaceLeftTop
    );

    const moved = newThisBubble.moveTo(relativePoint);
    listenerApi.dispatch(updateBubble(moved.toJSON()));
  },
});


// popChildInProcess 発火後、moveTo → updateBubble を実行
// openerのrenderedRectがすでにあれば、renderBubbleを待たずに即座に位置を計算
bubblesListener.startListening({
  actionCreator: popChildInProcess,
  effect: async (popChildAction, listenerApi) => {
    const payload = (popChildAction as ReturnType<typeof popChildInProcess>).payload;
    const poppingBubbleId = payload.bubbleId;
    const openingPosition = payload.openingPosition ?? "bubble-side";

    const state = listenerApi.getState() as any;

    const relation = selectBubblesRelationByOpeneeId(state, { openeeId: poppingBubbleId });
    if(!relation) {
      console.log("Pop: No relation found");
      return;
    }

    const openerBubble = selectBubble(state, { id: relation.openerId });
    const poppingBubble = selectBubble(state, { id: poppingBubbleId });

    // openerのrenderedRectがあれば、即座に位置を計算
    // calcPositionToOpenはtoLayerBelow().toGlobal()という純粋な数学的変換を使うので、
    // 実際のレンダリングを待つ必要がない
    if (openerBubble.renderedRect) {
      console.log("Pop: Calculating position immediately (no render wait)");

      // openingPositionに応じて基準となるrectを選択
      let baseRect = openerBubble.renderedRect;

      if (openingPosition === "origin-side") {
        // UrledPlace要素（クリック元）のrectを取得
        const originRect = getOriginRect(openerBubble.id, poppingBubble.url);
        if (originRect) {
          console.log("Pop: Using origin rect for positioning", originRect.position);
          baseRect = originRect;
        } else {
          console.log("Pop: Origin rect not found, falling back to bubble rect");
        }
      }

      // calcPositionToOpenはopeningSizeを使わないので、ダミー値でOK
      const point = baseRect.calcPositionToOpen({ width: 0, height: 0 });
      console.log("Pop: Calculated point to open at (global)", point, "openingPosition:", openingPosition);

      if (!point) {
        return;
      }

      // グローバル座標系の設定を取得
      const coordinateConfig = selectGlobalCoordinateSystem(state);
      const surfaceLeftTop = selectSurfaceLeftTop(state);

      // calcPositionToOpenはglobal座標を返す
      // これをトップレイヤー（layerIndex=0）のローカル座標に変換
      const relativePoint = convertGlobalPointToLayerLocal(
        point,
        0, // poppingBubbleはトップレイヤー（surface）に配置される
        coordinateConfig,
        surfaceLeftTop
      );

      console.log("Pop: Converted to layer-local point", relativePoint);

      const moved = poppingBubble.moveTo(relativePoint);

      // バブルを更新
      listenerApi.dispatch(updateBubble(moved.toJSON()));
      return;
    }

    // フォールバック: openerのrenderedRectがない場合は従来通りrenderを待つ
    console.log("Pop: Waiting for renders (fallback)");

    const results = await Promise.all([
      listenerApi.take(
        (otherAction): otherAction is ReturnType<typeof renderBubble> => {
          const oa = otherAction as ReturnType<typeof renderBubble>;
          return oa.type === renderBubble.type && oa.payload.id === relation.openerId;
        }
      ),
      listenerApi.take(
        (otherAction): otherAction is ReturnType<typeof renderBubble> => {
          const oa = otherAction as ReturnType<typeof renderBubble>;
          return oa.type === renderBubble.type && oa.payload.id === poppingBubbleId;
        }
      )
    ]);

    console.log("Pop: opener and openee rendered!", results);

    const newState = listenerApi.getState() as any;
    const newPoppingBubble = selectBubble(newState, { id: poppingBubbleId });
    const newOpenerBubble = selectBubble(newState, { id: relation.openerId });

    if(!newOpenerBubble.renderedRect || !newPoppingBubble.renderedRect) {
      console.log("Pop: renderedRect not found");
      return;
    }

    let baseRect = newOpenerBubble.renderedRect;

    if (openingPosition === "origin-side") {
      const originRect = getOriginRect(newOpenerBubble.id, newPoppingBubble.url);
      if (originRect) {
        baseRect = originRect;
      }
    }

    const point = baseRect.calcPositionToOpen(newPoppingBubble.renderedRect.size);

    if(!point) {
      return;
    }

    const coordinateConfig = selectGlobalCoordinateSystem(newState);
    const surfaceLeftTop = selectSurfaceLeftTop(newState);

    const relativePoint = convertGlobalPointToLayerLocal(
      point,
      0,
      coordinateConfig,
      surfaceLeftTop
    );

    const moved = newPoppingBubble.moveTo(relativePoint);
    listenerApi.dispatch(updateBubble(moved.toJSON()));
  },
});

// フォールバックタイマーをスケジュールするリスナー
// onTransitionEndが発火しない場合（新規バブル等）の保険
bubblesListener.startListening({
  actionCreator: popChildInProcess,
  effect: (_action, listenerApi) => {
    scheduleAnimationFallback(listenerApi.dispatch);
  },
});

bubblesListener.startListening({
  actionCreator: popChildMaxInProcess,
  effect: (_action, listenerApi) => {
    scheduleAnimationFallback(listenerApi.dispatch);
  },
});

bubblesListener.startListening({
  actionCreator: removeBubble,
  effect: (_action, listenerApi) => {
    scheduleAnimationFallback(listenerApi.dispatch);
  },
});
