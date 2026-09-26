import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  undockFromShowre,
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
import { Layer, type Point2, type SmartRect } from '@bublys-org/bubbles-ui-util';
import { Bubble } from '../Bubble.domain.js';
import { getOriginRect, getDockedBubbleRect } from '../utils/get-origin-rect.js';
import type { ShowreSide } from '../showre/Showre.domain.js';
import type { OpeningPosition } from './bubbles-slice.js';

// dropped-place は「方向」を持たない（点そのものが位置）ので、ここには来ない。
// Exclude で型に書いておくと、分岐を足し忘れたときにコンパイルが止まる。
const toDirection = (pos: Exclude<OpeningPosition, 'dropped-place'>): 'right' | 'left' | 'top' | 'bottom' => {
  if (pos === 'bubble-side-left')   return 'left';
  if (pos === 'bubble-side-top')    return 'top';
  if (pos === 'bubble-side-bottom') return 'bottom';
  return 'right';
};

/**
 * 落とされた点にバブルを置く。置けたら true。
 *
 * popChild（新しいレイヤー）でも joinSibling（同じレイヤー）でも、落とされた点に置く
 * ところは同じ。レイヤーをどうするかと、どこに置くかは別の話なので、位置決めはここに1つ。
 *
 * droppedAt は universe 座標。バブルの position は surface レイヤーの layer-local 座標
 * なので、他の位置指定と同じ変換を通す。
 */
const placeAtDroppedPoint = (
  listenerApi: { getState: () => any; dispatch: (action: any) => void },
  universeId: string,
  bubbleId: string,
  droppedAt: Point2 | undefined,
): boolean => {
  if (!droppedAt) {
    console.log("Place: dropped-place without droppedAt");
    return false;
  }
  const state = listenerApi.getState();
  const bubbleJson = state.bubbleState?.universes?.[universeId]?.bubbles?.[bubbleId];
  if (!bubbleJson) {
    console.log("Place: dropped bubble not found");
    return false;
  }
  const coordinateConfig = makeSelectGlobalCoordinateSystem(universeId)(state);
  const surfaceLeftTop = makeSelectSurfaceLeftTop(universeId)(state);
  const surfaceLayer = new Layer(0, surfaceLeftTop, coordinateConfig.vanishingPoint);
  const relativePoint = surfaceLayer.locate(droppedAt);

  listenerApi.dispatch(
    updateBubble(Bubble.fromJSON(bubbleJson).moveTo(relativePoint).toJSON(), universeId),
  );
  return true;
};

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
// 岸から引き剥がして落とした点へ置く。レイヤーに戻すこと（reducer）と、どこに置くかは別の話。
bubblesListener.startListening({
  actionCreator: undockFromShowre,
  effect: async (action, listenerApi) => {
    if (!action.payload.droppedAt) return;
    placeAtDroppedPoint(listenerApi, universeIdOf(action), action.payload.bubbleId, action.payload.droppedAt);
  },
});

bubblesListener.startListening({
  actionCreator: joinSiblingInProcess,
  effect: async (action, listenerApi) => {
    const id = action.payload.bubbleId;
    const universeId = universeIdOf(action);

    // 落として並べた場合は、隣に寄せずに落ちた点へ置く。
    // 同じレイヤーに入れる（＝兄弟になる）ことと、どこに置くかは別の話。
    if (action.payload.droppedAt) {
      placeAtDroppedPoint(listenerApi, universeId, id, action.payload.droppedAt);
      return;
    }

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


/** 岸の辺 → その岸から海へ向かう向き */
const towardSea: Record<ShowreSide, 'right' | 'left' | 'top' | 'bottom'> = {
  left: 'right',
  right: 'left',
  top: 'bottom',
  bottom: 'top',
};

/**
 * opener が岸に着いているときの「基準の矩形」と「開く向き」。
 *
 * ルール: 岸に着いたバブルから開いたバブルは、岸から海の側へ開く。
 * 基準は帯の中のクリック元（UrledPlace）、無ければ帯の要素そのもの。
 * 岸に着いている間は BubbleView が描かれず renderedRect が古いままなので、
 * DOM の帯を測る。浮いていれば undefined（通常の道）。
 */
const dockedOpenerBase = (
  state: any,
  universeId: string,
  openerId: string,
  openeeUrl: string,
): { rect: SmartRect; direction: 'right' | 'left' | 'top' | 'bottom' } | undefined => {
  const edges: readonly ShowreSide[] =
    state.bubbleState?.universes?.[universeId]?.docks?.[openerId]?.edges ?? [];
  // 貼り付いている辺の反対（＝海の側）へ開く。角なら最初の辺で決める
  const side = edges[0];
  if (!side) return undefined;
  const rect = getOriginRect(openerId, openeeUrl) ?? getDockedBubbleRect(openerId);
  if (!rect) return undefined;
  return { rect, direction: towardSea[side] };
};

/**
 * 岸の基準矩形の隣（海側）に置く位置（universe 座標）。
 * 帯は奥のレイヤーに退かないので、浮いている opener 用の calcPositionToOpen
 * （toLayerBelow を挟む）は使わない。開く側の大きさが分かっていれば
 * 帯にぴったり接する位置、分からなければ隣の領域の左上（既存の getNeighbor の規約）。
 */
const positionBesideDocked = (
  base: SmartRect,
  direction: 'right' | 'left' | 'top' | 'bottom',
  size: { width: number; height: number } | undefined,
): Point2 => {
  const g = base.toGlobal();
  const known = size && size.width > 0 && size.height > 0;
  if (known && direction === 'left') return { x: Math.max(0, g.x - size.width), y: g.y };
  if (known && direction === 'top') return { x: g.x, y: Math.max(0, g.y - size.height) };
  return g.getNeighbor(direction).position;
};

// popChildInProcess 発火後、moveTo → updateBubble を実行
// openerのrenderedRectがすでにあれば、renderBubbleを待たずに即座に位置を計算
bubblesListener.startListening({
  actionCreator: popChildInProcess,
  effect: async (popChildAction, listenerApi) => {
    const payload = (popChildAction as ReturnType<typeof popChildInProcess>).payload;
    const poppingBubbleId = payload.bubbleId;
    const openingPosition = payload.openingPosition ?? "bubble-side-right";
    const universeId = universeIdOf(popChildAction);

    const state = listenerApi.getState() as any;

    // 落とされた場所に開く場合、位置は「落ちた点」そのもの。
    // opener の矩形も relation も要らないので、relation の早期 return より前で片付ける
    // （ポケットからのドロップなど opener が居ないドロップも同じ道を通る）。
    if (openingPosition === "dropped-place") {
      placeAtDroppedPoint(listenerApi, universeId, poppingBubbleId, payload.droppedAt);
      return;
    }

    const relation = selectBubblesRelationByOpeneeId(state, { openeeId: poppingBubbleId, universeId });
    if(!relation) {
      console.log("Pop: No relation found");
      return;
    }

    const openerBubble = selectBubble(state, { id: relation.openerId, universeId });
    const poppingBubble = selectBubble(state, { id: poppingBubbleId, universeId });

    // opener が岸に着いていれば、帯を基準に海の側へ開く（renderedRect は使わない）
    const docked = dockedOpenerBase(state, universeId, relation.openerId, poppingBubble.url);
    if (docked) {
      const coordinateConfig = makeSelectGlobalCoordinateSystem(universeId)(state);
      const surfaceLeftTop = makeSelectSurfaceLeftTop(universeId)(state);
      const surfaceLayer = new Layer(0, surfaceLeftTop, coordinateConfig.vanishingPoint);
      const point = positionBesideDocked(docked.rect, docked.direction, poppingBubble.renderedRect?.size);
      const moved = poppingBubble.moveTo(surfaceLayer.locate(point));
      listenerApi.dispatch(updateBubble(moved.toJSON(), universeId));
      return;
    }

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
      const point = baseRect.calcPositionToOpen({ width: 0, height: 0 }, toDirection(openingPosition));
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

    const point = baseRect.calcPositionToOpen(newPoppingBubble.renderedRect.size, toDirection(openingPosition));

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
