import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import {
  Bubble,
  BubbleJson,
} from "../Bubble.domain.js";
import {
  BubblesProcess,
  BubblesProcessState,
} from "../BubblesProcess.domain.js";
import { BubblesProcessDPO } from "../BubblesProcessDPO.js";
import { CoordinateSystemData, CoordinateSystem, Point2 } from "@bublys-org/bubbles-ui-util";


type BubblesRelation = {
  openerId: string;
  openeeId: string;
}

export type OpeningPosition = "bubble-side" | "origin-side";

export type PopChildPayload = {
  bubbleId: string;
  openingPosition?: OpeningPosition;
}

/**
 * Normalized slice state:
 * - entities: map of BubbleState by ID
 * - process: BubblesProcessState holding layers of Bubble IDs
 */
export interface BubbleStateSlice {
  bubbles: Record<string, BubbleJson>;
  process: BubblesProcessState;

  bubbleRelations:  BubblesRelation[];

  globalCoordinateSystem: CoordinateSystemData;
  surfaceLeftTop: Point2; // レンダリング時に追加されるオフセット

  renderCount: number; //レンダリングが発生した回数。UIの強制再レンダリングに使う

  animatingBubbleIds: string[]; // アニメーション中のバブルID（リンクバブル非表示用）
}

// --- Initial bubbles configuration ---
// 各アプリがストア作成前に設定可能
let configuredInitialBubbleUrls: string[] = ["user-groups", "users"];

/**
 * 初期バブルのURLを設定する（slice注入前に呼び出す）
 */
export const setInitialBubbleUrls = (urls: string[]) => {
  configuredInitialBubbleUrls = urls;
};

// 初期状態を構築する関数（遅延評価）
const getInitialState = (): BubbleStateSlice => {
  const bubbleInstances = configuredInitialBubbleUrls.map((url, index) => {
    return new Bubble({
      url,
      colorHue: 200 - index * 20,
      type: url.split('/')[0],
      position: { x: index * 400, y: 0 },
    });
  });

  const entities: Record<string, BubbleJson> = {};
  bubbleInstances.forEach((b) => {
    entities[b.id] = b.toJSON();
  });

  const process: BubblesProcessState = {
    layers: bubbleInstances.map((b) => [b.id]),
  };

  return {
    bubbles: entities,
    process,
    bubbleRelations: [],
    globalCoordinateSystem: CoordinateSystem.GLOBAL.toData(),
    surfaceLeftTop: { x: 100, y: 100 },
    renderCount: 0,
    animatingBubbleIds: [],
  };
};

export const bubblesSlice = createSlice({
  name: "bubbleState",
  initialState: getInitialState,
  reducers: {
    // Process-only actions
    deleteProcessBubble: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .deleteBubble(action.payload)
        .toJSON();
      state.renderCount += 1;
    },
    layerDown: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .layerDown(action.payload)
        .toJSON();

      state.renderCount += 1;
    },
    layerUp: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .layerUp(action.payload)
        .toJSON();
      state.renderCount += 1;
    },

    popChild: (state, action: PayloadAction<PopChildPayload>) => {
      const process =   BubblesProcess.fromJSON(state.process);
      const poppedProcess = process.popChild(action.payload.bubbleId);
      state.process = poppedProcess.toJSON();
      state.renderCount += 1;
      // アニメーション対象のバブルIDを追加（重複防止）
      if (!state.animatingBubbleIds.includes(action.payload.bubbleId)) {
        state.animatingBubbleIds.push(action.payload.bubbleId);
      }
    },

    popChildMax: (state, action: PayloadAction<string>) => {

      const process = BubblesProcess.fromJSON(state.process);
      const poppedProcess = process.popChild(action.payload);

      state.process = poppedProcess.toJSON();
      state.renderCount += 1;
      // アニメーション対象のバブルIDを追加（重複防止）
      if (!state.animatingBubbleIds.includes(action.payload)) {
        state.animatingBubbleIds.push(action.payload);
      }
    },


    joinSibling: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .joinSibling(action.payload)
        .toJSON();

      state.renderCount += 1;
    },

    finishBubbleAnimation: (state, action: PayloadAction<string>) => {
      state.animatingBubbleIds = state.animatingBubbleIds.filter(id => id !== action.payload);
    },

    // フォールバック：全てのアニメーション状態をクリア
    clearAllAnimations: (state) => {
      state.animatingBubbleIds = [];
    },

    // Entity-only actions
    addBubble: (state, action: PayloadAction<BubbleJson>) => {
      state.bubbles[action.payload.id] = action.payload;

      state.renderCount += 1;
    },
    updateBubble: (state, action: PayloadAction<BubbleJson>) => {
      state.bubbles[action.payload.id] = action.payload;
      state.renderCount += 1;
    },
    renderBubble: (state, action: PayloadAction<BubbleJson>) => {
      state.bubbles[action.payload.id] = action.payload;
    },

    // Combined action
    removeBubble: (state, action: PayloadAction<string>) => {
      const removingId = action.payload;
      delete state.bubbles[removingId];
      state.renderCount += 1;

      state.bubbleRelations = state.bubbleRelations.filter(
        relation => relation.openerId !== removingId && relation.openeeId !== removingId
      );

      // Remove from process layers
      state.process.layers = state.process.layers.map(
        layer => layer.filter(id => id !== removingId)
      ).filter(layer => layer.length > 0);  // Remove empty layers

      // レイヤー移動アニメーションが発生するので、ダミーIDを追加
      // （フォールバックタイマーでクリアされる）
      if (!state.animatingBubbleIds.includes('__removing__')) {
        state.animatingBubbleIds.push('__removing__');
      }
    },
    relateBubbles: (state, action: PayloadAction<BubblesRelation>) => {
      //重複がないようにチェックが必要そう

      if(action.payload.openerId === "root") {
        return ;
      }

      state.bubbleRelations.push(action.payload);
    },
    setGlobalCoordinateSystem: (state, action: PayloadAction<CoordinateSystemData>) => {
      state.globalCoordinateSystem = action.payload;
    },
    setSurfaceLeftTop: (state, action: PayloadAction<Point2>) => {
      state.surfaceLeftTop = action.payload;
    }
  },
});

export const {
  deleteProcessBubble,
  layerDown,
  layerUp,
  popChild: popChildInProcess,
  popChildMax: popChildMaxInProcess,
  joinSibling: joinSiblingInProcess,
  addBubble,
  updateBubble,
  renderBubble,
  removeBubble,
  relateBubbles,
  setGlobalCoordinateSystem,
  setSurfaceLeftTop,
  finishBubbleAnimation,
  clearAllAnimations,
} = bubblesSlice.actions;

// Selectors
export const selectBubble = (state: { bubbleState: BubbleStateSlice }, { id }: { id: string }) =>
  Bubble.fromJSON(state.bubbleState.bubbles[id]);

// Selectors
export const selectRenderCount = (state: { bubbleState: BubbleStateSlice }) =>
  state.bubbleState.renderCount;

// 基本セレクター（入力セレクター）
const selectBubblesJson = (state: { bubbleState: BubbleStateSlice }) => state.bubbleState.bubbles;
const selectProcessJson = (state: { bubbleState: BubbleStateSlice }) => state.bubbleState.process;
const selectBubbleRelationsRaw = (state: { bubbleState: BubbleStateSlice }) => state.bubbleState.bubbleRelations;

/**
 * サーフェスバブルのIDリストを返す（パフォーマンス最適化版）
 * Bubbleオブジェクトの生成を避ける
 */
export const selectSurfaceBubbleIds = createSelector(
  [selectProcessJson, selectBubblesJson],
  (processJson, bubblesJson): string[] => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    return surfaceIds.filter(id => bubblesJson[id] !== undefined);
  }
);

export const selectSurfaceBubbles = createSelector(
  [selectProcessJson, selectBubblesJson],
  (processJson, bubblesJson) => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    return surfaceIds
      .filter(id => bubblesJson[id] !== undefined)
      .map(id => Bubble.fromJSON(bubblesJson[id]));
  }
);

/**
 * 最後の兄弟バブル（サーフェスの最後のバブル）のrenderedRectを取得
 * joinSiblingリスナー用の最適化セレクター
 */
export const selectLastSiblingRenderedRect = createSelector(
  [selectProcessJson, selectBubblesJson],
  (processJson, bubblesJson) => {
    const process = BubblesProcess.fromJSON(processJson);
    const surfaceIds = process.surface || [];
    if (surfaceIds.length === 0) return undefined;

    const lastId = surfaceIds[surfaceIds.length - 1];
    const bubbleJson = bubblesJson[lastId];
    if (!bubbleJson) return undefined;

    // renderedRectだけを返す（Bubbleオブジェクト全体を作らない）
    return bubbleJson.renderedRect
      ? { bubbleId: lastId, renderedRect: Bubble.fromJSON(bubbleJson).renderedRect }
      : undefined;
  }
);

export const selectBubblesRelations = (state: { bubbleState: BubbleStateSlice }) => {
  return state.bubbleState.bubbleRelations;
}

export const selectBubblesRelationByOpeneeId = (state: { bubbleState: BubbleStateSlice }, { openeeId }: { openeeId: string }) => {
  return state.bubbleState.bubbleRelations.find(relation => relation.openeeId === openeeId);
}

/**
 * @deprecated パフォーマンス問題のため、代わりに selectValidBubbleRelationIds を使用してください
 */
export const selectBubblesRelationsWithBubble = createSelector(
  [selectBubbleRelationsRaw, selectBubblesJson],
  (relations, bubblesJson) => {
    return relations
      .filter(relation => bubblesJson[relation.openerId] && bubblesJson[relation.openeeId])
      .map(relation => ({
        opener: Bubble.fromJSON(bubblesJson[relation.openerId]),
        openee: Bubble.fromJSON(bubblesJson[relation.openeeId]),
      }));
  }
);

/**
 * 有効なバブル関係のIDペアのみを返す（パフォーマンス最適化版）
 * Bubbleオブジェクトの生成は各LinkBubbleViewで行う
 */
export const selectValidBubbleRelationIds = createSelector(
  [selectBubbleRelationsRaw, selectBubblesJson],
  (relations, bubblesJson): Array<{ openerId: string; openeeId: string }> => {
    return relations.filter(
      relation => bubblesJson[relation.openerId] && bubblesJson[relation.openeeId]
    );
  }
);

const selectGlobalCoordinateSystemData = (state: { bubbleState: BubbleStateSlice }): CoordinateSystemData => {
  return state.bubbleState.globalCoordinateSystem;
}

export const selectGlobalCoordinateSystem = createSelector(
  [selectGlobalCoordinateSystemData],
  (data): CoordinateSystem => CoordinateSystem.fromData(data)
);

export const selectSurfaceLeftTop = (state: { bubbleState: BubbleStateSlice }): Point2 => {
  return state.bubbleState.surfaceLeftTop;
}

/**
 * Returns the layerIndex of a bubble by its ID.
 * Returns -1 if the bubble is not found in any layer.
 */
export const selectBubbleLayerIndex = (state: { bubbleState: BubbleStateSlice }, { id }: { id: string }): number => {
  const process = BubblesProcess.fromJSON(state.bubbleState.process);
  const layers = process.layers;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    if (layers[layerIndex].includes(id)) {
      return layerIndex;
    }
  }

  return -1; // not found
}

/**
 * Returns a BubblesProcessDPO instance for the given state.
 * Memoized to prevent unnecessary re-renders.
 */
export const selectBubblesProcessDPO = createSelector(
  [selectBubblesJson, selectProcessJson],
  (bubblesJson, processJson): BubblesProcessDPO => {
    const bubbles = Object.values(bubblesJson).map((s) => Bubble.fromJSON(s));
    const processInstance = BubblesProcess.fromJSON(processJson);
    return new BubblesProcessDPO(processInstance, bubbles);
  }
);

export const selectIsLayerAnimating = (state: { bubbleState: BubbleStateSlice }): boolean => {
  return state.bubbleState.animatingBubbleIds.length > 0;
}

/**
 * レイヤー構造（IDの配列のみ）を返す
 * バブルインスタンスは含まない - 各BubbleViewが個別に取得する
 */
export const selectBubbleLayers = createSelector(
  [selectProcessJson],
  (processJson): string[][] => {
    const process = BubblesProcess.fromJSON(processJson);
    return process.layers;
  }
);

/**
 * 個別バブルをIDで取得するセレクターファクトリー
 * 各バブルごとにメモ化され、そのバブルが変わった時だけ再計算
 */
type BubbleByIdSelector = (state: { bubbleState: BubbleStateSlice }) => Bubble | undefined;
const bubbleSelectorCache = new Map<string, BubbleByIdSelector>();

export const makeSelectBubbleById = (bubbleId: string): BubbleByIdSelector => {
  if (!bubbleSelectorCache.has(bubbleId)) {
    const selector = createSelector(
      [(state: { bubbleState: BubbleStateSlice }) => state.bubbleState.bubbles[bubbleId]],
      (bubbleJson): Bubble | undefined => {
        if (!bubbleJson) return undefined;
        return Bubble.fromJSON(bubbleJson);
      }
    );
    bubbleSelectorCache.set(bubbleId, selector);
  }
  return bubbleSelectorCache.get(bubbleId)!;
};

/**
 * 個別バブルのlayerIndexを取得するセレクターファクトリー
 */
type LayerIndexSelector = (state: { bubbleState: BubbleStateSlice }) => number;
const layerIndexSelectorCache = new Map<string, LayerIndexSelector>();

export const makeSelectBubbleLayerIndex = (bubbleId: string): LayerIndexSelector => {
  if (!layerIndexSelectorCache.has(bubbleId)) {
    const selector = createSelector(
      [selectProcessJson],
      (processJson): number => {
        const process = BubblesProcess.fromJSON(processJson);
        const layers = process.layers;
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
          if (layers[layerIndex].includes(bubbleId)) {
            return layerIndex;
          }
        }
        return -1;
      }
    );
    layerIndexSelectorCache.set(bubbleId, selector);
  }
  return layerIndexSelectorCache.get(bubbleId)!;
};

export default bubblesSlice.reducer;

// rootReducerにbubblesSliceを動的に注入する関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const injectBubblesSlice = (rootReducer: any) => {
  bubblesSlice.injectInto(rootReducer);
};
