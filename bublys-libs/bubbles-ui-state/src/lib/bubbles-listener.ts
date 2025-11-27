import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  popChildInProcess,
  renderBubble,
  selectBubble,
  selectBubblesRelationByOpeneeId,
  selectSurfaceBubbles,
  updateBubble,
  selectCoordinateSystem,
  selectSurfaceLeftTop,
} from './bubbles-slice.js';
import { convertGlobalPointToLayerLocal } from '@bublys-org/bubbles-ui';

// Listener ミドルウェアを定義
export const bubblesListener = createListenerMiddleware();

// joinSiblingInProcess 発火後、renderBubble の完了を待ち moveTo → updateBubble を順次実行
bubblesListener.startListening({
  actionCreator: joinSiblingInProcess,
  effect: async (action, listenerApi) => {
    const id = (action as ReturnType<typeof joinSiblingInProcess>).payload;

    // renderBubble が dispatch され、かつ payload.id が id と一致するのを待つ
    await listenerApi.take(
      (otherAction): otherAction is ReturnType<typeof renderBubble> => {
        const oa = otherAction as ReturnType<typeof renderBubble>;
        return oa.type === renderBubble.type && oa.payload.id === id;
      }
    );

    // 現在の state から対象バブルを取得
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

    if (!brotherRect) {
      console.log("JoinSibling: Brother bubble has no renderedRect");
      return;
    }

    // 兄弟の隣に配置すべき位置を計算（グローバル座標）
    const globalPoint = brotherRect.calcPositionForSibling(
      thisBubble.renderedRect?.size || { width: 0, height: 0 }
    );
    console.log("JoinSibling: Calculated position (global)", globalPoint);

    if (!globalPoint) {
      return;
    }

    // グローバル座標系の設定を取得
    const coordinateConfig = selectCoordinateSystem(state);
    const surfaceLeftTop = selectSurfaceLeftTop(state);
    console.log("JoinSibling: Coordinate config", coordinateConfig);
    console.log("JoinSibling: Surface left top", surfaceLeftTop);

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
  },
});


// joinSiblingInProcess 発火後、renderBubble の完了を待ち moveTo → updateBubble を順次実行
bubblesListener.startListening({
  actionCreator: popChildInProcess,
  effect: async (popChildAction, listenerApi) => {
    const poppingBubbleId = (popChildAction as ReturnType<typeof popChildInProcess>).payload;


    const state = listenerApi.getState() as any;

    const relation = selectBubblesRelationByOpeneeId(state, { openeeId: poppingBubbleId });
    if(!relation) {
      console.log("Pop: No relation found");
      
      return;
    }




    const results = await Promise.all([
      listenerApi.take(
        (otherAction): otherAction is ReturnType<typeof renderBubble> => {
          const oa = otherAction as ReturnType<typeof renderBubble>;
          
          const condition = oa.type === renderBubble.type && 
            oa.payload.id === relation.openerId;
            // oa.payload.renderedRect?.x !== 100 &&  //TODO: ハードコーディング回避
            // oa.payload.renderedRect?.y !== 100 ; //TODO: もとの位置と変わっていた場合、というのをとりたいがまだうまくいっていない

          if(condition) {
            console.log("Pop: Opener bubble render detected", oa.payload.id);
            console.log("Pop: Opener bubble render detected", oa.payload.renderedRect?.x, oa.payload.renderedRect?.y);

          }

          return condition;
        }
      ),
      listenerApi.take(
        (otherAction): otherAction is ReturnType<typeof renderBubble> => {
          const oa = otherAction as ReturnType<typeof renderBubble>;
          console.log("Pop: Waiting for popping bubble render", oa.payload.id, poppingBubbleId);
          return oa.type === renderBubble.type && oa.payload.id === poppingBubbleId;
        }
      )
    ]);
    
    console.log("Pop: opener and openee rendered!", results);

      // renderBubble が dispatch され、かつ payload.id が id と一致するのを待つ


    //どこに描画されたかsmartRectを表示

    const newState = listenerApi.getState() as any;

    //TODO: 
    const poppingBubble = selectBubble(newState as any, { id: poppingBubbleId });
    const openerBubble = selectBubble(newState as any, { id: relation.openerId });

    console.log(`Pop: Popped bubble ${openerBubble.id} renderedRect: ${JSON.stringify(openerBubble.renderedRect)}`);
    console.log(`Pop: Popped bubble ${poppingBubble.id} renderedRect: ${JSON.stringify(poppingBubble.renderedRect)}`);

    if(!openerBubble.renderedRect || !poppingBubble.renderedRect) { 
      console.log("Pop: renderedRect not found");
      return;
    }

    const point = openerBubble.renderedRect.calcPositionToOpen(poppingBubble.renderedRect.size);
    console.log("Pop: Calculated point to open at (global)", point);


    if(!point) {
      return;
    }

    // グローバル座標系の設定を取得
    const coordinateConfig = selectCoordinateSystem(newState);
    const surfaceLeftTop = selectSurfaceLeftTop(newState);
    console.log("Pop: Global coordinate config", coordinateConfig);
    console.log("Pop: Surface left top", surfaceLeftTop);

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


  },
});
