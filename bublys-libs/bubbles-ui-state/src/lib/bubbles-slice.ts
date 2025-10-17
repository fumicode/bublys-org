import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Bubble,
  BubbleState,
  BubblesProcess,
  BubblesProcessState,
  BubblesProcessDPO,
} from "@bublys-org/bubbles-ui";

/**
 * Normalized slice state:
 * - entities: map of BubbleState by ID
 * - process: BubblesProcessState holding layers of Bubble IDs
 */
export interface BubbleStateSlice {
  bubbles: Record<string, BubbleState>;
  process: BubblesProcessState;
}

// --- Initial data setup ---
const initialBubbleInstances: Bubble[] = [
  new Bubble({
    name: "user-groups",
    colorHue: 200,
    type: "user-groups",
  }),
  new Bubble({
    name: "Element E",
    colorHue: 100,
    type: "normal",
  }),
  new Bubble({
    name: "Element F",
    colorHue: 300,
    type: "normal",
  }),
];

// Build entities map
const initialEntities: Record<string, BubbleState> = {};
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
    },
    layerDown: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .layerDown(action.payload)
        .toJSON();
    },
    layerUp: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .layerUp(action.payload)
        .toJSON();
    },
    popChildInProcess: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .popChild(action.payload)
        .toJSON();
    },
    joinSiblingInProcess: (state, action: PayloadAction<string>) => {
      state.process = BubblesProcess.fromJSON(state.process)
        .joinSibling(action.payload)
        .toJSON();
    },

    // Entity-only actions
    addBubble: (state, action: PayloadAction<BubbleState>) => {
      state.bubbles[action.payload.id] = action.payload;
    },
    updateBubble: {
      prepare: (bubble: Bubble) => ({
        payload: bubble.toJSON(),
      }),
      reducer: (state, action: PayloadAction<BubbleState>) => {
        state.bubbles[action.payload.id] = action.payload;
      },
    },
    // Combined action
    removeBubble: (state, action: PayloadAction<string>) => {
      const id = action.payload;

      delete state.bubbles[id];
      //TODO: Also remove from process
      // state.process = BubblesProcess.fromJSON(state.process)
      //   .removeBubble(id)
      //   .toJSON();
    },
  },
});

export const {
  deleteProcessBubble,
  layerDown,
  layerUp,
  popChildInProcess,
  joinSiblingInProcess,
  addBubble,
  updateBubble,
  removeBubble,
} = bubblesSlice.actions;


// Selectors
export const selectBubble = (state: { bubbleState: BubbleStateSlice }, { id }: { id: string }) =>
  new Bubble(state.bubbleState.bubbles[id]);

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
