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
  entities: Record<string, BubbleState>;
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
  entities: initialEntities,
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
      state.entities[action.payload.id] = action.payload;
    },
    moveBubble: (
      state,
      action: PayloadAction<{ id: string; position: { x: number; y: number } }>
    ) => {
      const { id, position } = action.payload;
      const updated = Bubble.fromJSON(state.entities[id]).moveTo(position);
      state.entities[id] = updated.toJSON();
    },
    renameBubble: (
      state,
      action: PayloadAction<{ id: string; newName: string }>
    ) => {
      const { id, newName } = action.payload;
      const updated = Bubble.fromJSON(state.entities[id]).rename(newName);
      state.entities[id] = updated.toJSON();
    },
    resizeBubble: (
      state,
      action: PayloadAction<{ id: string; size: { width: number; height: number } }>
    ) => {
      const { id, size } = action.payload;
      const updated = Bubble.fromJSON(state.entities[id]).resizeTo(size);
      state.entities[id] = updated.toJSON();
    },
    removeBubble: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
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
  moveBubble,
  renameBubble,
  resizeBubble,
  removeBubble,
} = bubblesSlice.actions;

// Selectors
export const selectEntities = (state: { bubbleState: BubbleStateSlice }) =>
  state.bubbleState.entities;

export const selectProcess = (state: { bubbleState: BubbleStateSlice }) =>
  state.bubbleState.process;

/**
 * Returns a BubblesProcessDPO instance for the given state.
 */
export const selectBubblesProcessDPO = (
  state: { bubbleState: BubbleStateSlice }
): BubblesProcessDPO => {
  const { entities, process } = state.bubbleState;
  const bubbles = Object.values(entities).map((s) => Bubble.fromJSON(s));
  const processInstance = BubblesProcess.fromJSON(process);
  return new BubblesProcessDPO(processInstance, bubbles);
};

export default bubblesSlice.reducer;
