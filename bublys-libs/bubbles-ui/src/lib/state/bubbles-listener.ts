import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  popChildInProcess,
  popChildMaxInProcess,
  removeBubble,
  renderBubble,
  selectBubble,
  selectBubblesRelationByOpeneeId,
  makeSelectSurfaceBubbleIds,
  makeSelectLastSiblingRenderedRect,
  updateBubble,
  makeSelectGlobalCoordinateSystem,
  makeSelectSurfaceLeftTop,
  clearAllAnimations,
  ROOT_UNIVERSE_ID,
} from './bubbles-slice.js';
import { Layer } from '@bublys-org/bubbles-ui-util';
import { getOriginRect } from '../utils/get-origin-rect.js';

// アクションの meta から universeId を取り出す（無ければ root）
const universeIdOf = (action: { meta?: { universeId?: string } }): string =>
  action.meta?.universeId ?? ROOT_UNIVERSE_ID;

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

// joinSiblingInProcess 発火後、兄弟バブルの隣に配置
bubblesListener.startListening({
  actionCreator: joinSiblingInProcess,
  effect: async (action, listenerApi) => {
    const id = action.payload;
    const universeId = universeIdOf(action);

    const state = listenerApi.getState() as any;

    // パフォーマンス最適化: IDリストだけを取得
    const surfaceIds = makeSelectSurfaceBubbleIds(universeId)(state);
    const otherSiblingIds = surfaceIds.filter(siblingId => siblingId !== id);

    const thisBubble = selectBubble(state, { id, universeId });

    if (!otherSiblingIds.length) {
      console.log("JoinSibling: No other siblings, skipping positioning");
      return;
    }

    // パフォーマンス最適化: 最後の兄弟のrenderedRectだけを取得
    const lastSiblingData = makeSelectLastSiblingRenderedRect(universeId)(state);

    // 自分自身が最後の場合は、その前のバブルを使う
    const brotherRect = (lastSiblingData && lastSiblingData.bubbleId !== id)
      ? lastSiblingData.renderedRect
      : (otherSiblingIds.length > 0
          ? selectBubble(state, { id: otherSiblingIds[otherSiblingIds.length - 1], universeId })?.renderedRect
          : undefined);

    // 兄弟バブルのrenderedRectがあれば、即座に位置を計算
    if (brotherRect) {
      console.log("JoinSibling: Calculating position immediately (no render wait)");

      // 兄弟の隣に配置すべき位置を計算（グローバル座標）
      const estimatedSize = thisBubble.renderedRect?.size || brotherRect.size;
      const globalPoint = brotherRect.calcPositionForSibling(estimatedSize);
      console.log("JoinSibling: Calculated position (global)", globalPoint);

      if (!globalPoint) {
        return;
      }

      // グローバル座標系の設定を取得
      const coordinateConfig = makeSelectGlobalCoordinateSystem(universeId)(state);
      const surfaceLeftTop = makeSelectSurfaceLeftTop(universeId)(state);

      // universe 座標を surface レイヤー(index=0)の layer-local 座標に変換
      // （joinSibling はトップレイヤー＝surface に配置される）
      const surfaceLayer = new Layer(0, surfaceLeftTop, coordinateConfig.vanishingPoint);
      const relativePoint = surfaceLayer.locate(globalPoint);

      console.log("JoinSibling: Converted to layer-local point", relativePoint);

      const moved = thisBubble.moveTo(relativePoint);

      // バブルを更新
      listenerApi.dispatch(updateBubble(moved.toJSON(), universeId));
      return;
    }

    // フォールバック: 兄弟バブルのrenderedRectがない場合は従来通りrenderを待つ
    console.log("JoinSibling: Waiting for render (fallback)");

    await listenerApi.take(
      (otherAction): otherAction is ReturnType<typeof renderBubble> => {
        const oa = otherAction as ReturnType<typeof renderBubble>;
        return oa.type === renderBubble.type && oa.payload.id === id && universeIdOf(oa) === universeId;
      }
    );

    const newState = listenerApi.getState() as any;
    const newThisBubble = selectBubble(newState, { id, universeId });

    // self-abort: await の間に rehydrate で自分のバブルが state から消えていたら
    // もう関係ない仕事なので何もしない（不是 D 対策、docs/popchild-flow.md 参照）。
    if (!newThisBubble) {
      console.log("JoinSibling: stale (bubble removed during await)");
      return;
    }

    // パフォーマンス最適化: IDリストだけを取得
    const newSurfaceIds = makeSelectSurfaceBubbleIds(universeId)(newState);
    const newOtherSiblingIds = newSurfaceIds.filter(siblingId => siblingId !== id);

    if (!newOtherSiblingIds.length) {
      return;
    }

    // 最後の兄弟バブルを取得
    const newBrotherBubble = selectBubble(newState, { id: newOtherSiblingIds[newOtherSiblingIds.length - 1], universeId });
    const newBrotherRect = newBrotherBubble?.renderedRect;

    if (!newBrotherRect) {
      console.log("JoinSibling: Brother bubble has no renderedRect");
      return;
    }

    const estimatedSize = newThisBubble.renderedRect?.size || newBrotherRect.size;
    const globalPoint = newBrotherRect.calcPositionForSibling(estimatedSize);

    if (!globalPoint) {
      return;
    }

    const coordinateConfig = makeSelectGlobalCoordinateSystem(universeId)(newState);
    const surfaceLeftTop = makeSelectSurfaceLeftTop(universeId)(newState);

    const surfaceLayer = new Layer(0, surfaceLeftTop, coordinateConfig.vanishingPoint);
    const relativePoint = surfaceLayer.locate(globalPoint);

    const moved = newThisBubble.moveTo(relativePoint);
    listenerApi.dispatch(updateBubble(moved.toJSON(), universeId));
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
    const universeId = universeIdOf(popChildAction);

    const state = listenerApi.getState() as any;

    const relation = selectBubblesRelationByOpeneeId(state, { openeeId: poppingBubbleId, universeId });
    if(!relation) {
      console.log("Pop: No relation found");
      return;
    }

    const openerBubble = selectBubble(state, { id: relation.openerId, universeId });
    const poppingBubble = selectBubble(state, { id: poppingBubbleId, universeId });

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
      const coordinateConfig = makeSelectGlobalCoordinateSystem(universeId)(state);
      const surfaceLeftTop = makeSelectSurfaceLeftTop(universeId)(state);

      // calcPositionToOpen は universe 座標を返す。
      // surface レイヤー(index=0)の layer-local 座標に変換する
      // （poppingBubble はトップレイヤー＝surface に配置される）
      const surfaceLayer = new Layer(0, surfaceLeftTop, coordinateConfig.vanishingPoint);
      const relativePoint = surfaceLayer.locate(point);

      console.log("Pop: Converted to layer-local point", relativePoint);

      const moved = poppingBubble.moveTo(relativePoint);

      listenerApi.dispatch(updateBubble(moved.toJSON(), universeId));
      return;
    }

    // フォールバック: openerのrenderedRectがない場合は従来通りrenderを待つ
    console.log("Pop: Waiting for renders (fallback)");

    const results = await Promise.all([
      listenerApi.take(
        (otherAction): otherAction is ReturnType<typeof renderBubble> => {
          const oa = otherAction as ReturnType<typeof renderBubble>;
          return oa.type === renderBubble.type && oa.payload.id === relation.openerId && universeIdOf(oa) === universeId;
        }
      ),
      listenerApi.take(
        (otherAction): otherAction is ReturnType<typeof renderBubble> => {
          const oa = otherAction as ReturnType<typeof renderBubble>;
          return oa.type === renderBubble.type && oa.payload.id === poppingBubbleId && universeIdOf(oa) === universeId;
        }
      )
    ]);

    console.log("Pop: opener and openee rendered!", results);

    const newState = listenerApi.getState() as any;
    const newPoppingBubble = selectBubble(newState, { id: poppingBubbleId, universeId });
    const newOpenerBubble = selectBubble(newState, { id: relation.openerId, universeId });

    // self-abort: await の間に rehydrate（世界線の戻る等）で対象バブルが state
    // から消えていたら、自分はもう関係ない仕事になっているので何もしない。
    // ここで return しないと、updateBubble が削除済バブルへ向けて投げられ、
    // 履歴トレイル汚染（不是 D）を起こす。詳細は docs/popchild-flow.md 参照。
    if (!newPoppingBubble || !newOpenerBubble) {
      console.log("Pop: stale (bubble removed during await)");
      return;
    }

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

    const coordinateConfig = makeSelectGlobalCoordinateSystem(universeId)(newState);
    const surfaceLeftTop = makeSelectSurfaceLeftTop(universeId)(newState);

    const surfaceLayer = new Layer(0, surfaceLeftTop, coordinateConfig.vanishingPoint);
    const relativePoint = surfaceLayer.locate(point);

    const moved = newPoppingBubble.moveTo(relativePoint);
    listenerApi.dispatch(updateBubble(moved.toJSON(), universeId));
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
