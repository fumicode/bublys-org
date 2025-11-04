import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  joinSiblingInProcess,
  popChildInProcess,
  renderBubble,
  selectBubble,
  selectBubblesRelationByOpeneeId,
  selectSurfaceBubbles,
  updateBubble,
} from './bubbles-slice.js';

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
      return;
    }
    //全ての幅を足す
    // const totalWidth = otherSiblingBubbles.reduce((sum, b) => sum + (b.renderedRect?.width || 0), 0);
    // const thisBubble = selectBubble(state, { id });
    // const moved = thisBubble.moveTo({ x: totalWidth, y: 0 });



    const thisBubble = selectBubble(state, { id });

    //他のバブルの領域を合体mergeする
    //const merged = otherSiblingBubbles.map(b => b.renderedRect).filter((b): b is SmartRect=> !!b).reduce((acc, b) => acc.merge(b));

    const brotherBubble = otherSiblingBubbles[otherSiblingBubbles.length -1];

    const brotherRect = brotherBubble.renderedRect;

    if(!brotherRect) {
      return;
    }

    const point = brotherRect.calcPositionToOpen(thisBubble.renderedRect?.size || { width: 0, height: 0 });

    //listenerApi.dispatch(addPoint(point));

    if(!point) {
      return;
    }

    const moved = thisBubble.moveTo(point);

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
    console.log("Pop: Calculated point to open at", point);
    

    if(!point) {
      return;
    }

    const moved = poppingBubble.moveTo(point);

    // バブルを更新
    listenerApi.dispatch(updateBubble(moved.toJSON()));


  },
});
