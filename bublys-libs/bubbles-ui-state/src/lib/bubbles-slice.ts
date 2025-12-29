import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Bubble,
  BubbleJson,
  BubblesProcess,
  BubblesProcessState,
  BubblesProcessDPO,
  CoordinateSystem,
  GLOBAL_COORDINATE_SYSTEM,
  Point2,
} from "@bublys-org/bubbles-ui";


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

  globalCoordinateSystem: CoordinateSystem;
  surfaceLeftTop: Point2; // レンダリング時に追加されるオフセット

  renderCount: number; //レンダリングが発生した回数。UIの強制再レンダリングに使う
}

// --- Initial data setup ---
const initialBubbleInstances: Bubble[] = [
  new Bubble({
    url: "user-groups",
    colorHue: 200,
    type: "user-groups",
  }),
  new Bubble({
    url: "Element E",
    colorHue: 100,
    type: "normal",
    size: { width: 300, height: 200 }, // サイズ指定のテスト
  }),
  new Bubble({
    url: "Element F",
    colorHue: 300,
    type: "normal",
  }),
];

// Build entities map
const initialEntities: Record<string, BubbleJson> = {};
initialBubbleInstances.forEach((b) => {
  initialEntities[b.id] = b.toJSON();
});

// Build process.layers of IDs
const initialProcess: BubblesProcessState = {
  layers: initialBubbleInstances.map((b) => [b.id]),
};

// Combined initial state
const initialState: BubbleStateSlice = {
  bubbles: initialEntities,
  process: initialProcess,
  bubbleRelations: [],
  globalCoordinateSystem: GLOBAL_COORDINATE_SYSTEM,
  surfaceLeftTop: { x: 100, y: 100 }, // デフォルト値
  renderCount: 0,
};

export const bubblesSlice = createSlice({
  name: "bubbleState",
  initialState,
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
    },

    popChildMax: (state, action: PayloadAction<string>) => {

      const process = BubblesProcess.fromJSON(state.process);
      const poppedProcess = process.popChild(action.payload);

      state.process = poppedProcess.toJSON();
      state.renderCount += 1;
    },


    joinSibling: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .joinSibling(action.payload)
        .toJSON();

      state.renderCount += 1;
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
    },
    relateBubbles: (state, action: PayloadAction<BubblesRelation>) => {
      //重複がないようにチェックが必要そう

      if(action.payload.openerId === "root") {
        return ;
      }

      state.bubbleRelations.push(action.payload);
    },
    setGlobalCoordinateSystem: (state, action: PayloadAction<CoordinateSystem>) => {
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
} = bubblesSlice.actions;

// Selectors
export const selectBubble = (state: { bubbleState: BubbleStateSlice }, { id }: { id: string }) =>
  Bubble.fromJSON(state.bubbleState.bubbles[id]);

// Selectors
export const selectRenderCount = (state: { bubbleState: BubbleStateSlice }) =>
  state.bubbleState.renderCount;

export const selectSurfaceBubbles = (state: { bubbleState: BubbleStateSlice }) => {
  const process = BubblesProcess.fromJSON(state.bubbleState.process);
  const bubbles = state.bubbleState.bubbles;
  const surfaceIds = process.surface || [];
  return surfaceIds.map(id => Bubble.fromJSON(bubbles[id]));
}

export const selectBubblesRelations = (state: { bubbleState: BubbleStateSlice }) => {
  return state.bubbleState.bubbleRelations;
}

export const selectBubblesRelationByOpeneeId = (state: { bubbleState: BubbleStateSlice }, { openeeId }: { openeeId: string }) => {
  return state.bubbleState.bubbleRelations.find(relation => relation.openeeId === openeeId);
}

export const selectBubblesRelationsWithBubble = (state: { bubbleState: BubbleStateSlice }) => {
  const relations = state.bubbleState.bubbleRelations;
  const bubbles = state.bubbleState.bubbles;
  return relations.map(relation => {
    return({
      opener: Bubble.fromJSON(bubbles[relation.openerId]),
      openee: Bubble.fromJSON(bubbles[relation.openeeId]),
    }
  )});
}

export const selectGlobalCoordinateSystem = (state: { bubbleState: BubbleStateSlice }): CoordinateSystem => {
  return state.bubbleState.globalCoordinateSystem;
}

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
 */
export const selectBubblesProcessDPO = (
  state: { bubbleState: BubbleStateSlice } //bubbleStateという名前は、bubblesSliceのnameと一致させる
): BubblesProcessDPO => {
  const { bubbles: bubblesJson, process: processJson } = state.bubbleState;
  const bubbles = Object.values(bubblesJson).map((s) => Bubble.fromJSON(s));
  const processInstance = BubblesProcess.fromJSON(processJson);
  return new BubblesProcessDPO(processInstance, bubbles);
};

export default bubblesSlice.reducer;