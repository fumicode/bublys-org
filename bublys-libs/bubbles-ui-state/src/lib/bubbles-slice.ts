import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Bubble,
  BubbleState,
  BubblesProcess,
  BubblesProcessState,
} from "@bublys-org/bubbles-ui";

const bubblesProcess = [
  [
    new Bubble({
      name: "user-groups",
      colorHue: 200,
      type: "user-groups",
    }),
  ],
  [
    new Bubble({
      name: "Element E",
      colorHue: 100,
      type: "normal",
    }),
  ],
  [
    new Bubble({
      name: "Element F",
      colorHue: 300,
      type: "normal",
    }),
  ],
];

const initialState: BubblesProcessState = bubblesProcess.map((layer) =>
  layer.map((bubble) => bubble.toJSON())
);

const bubbleState = {
  bubblesProcess: initialState,
};

export const bubblesSlice = createSlice({
  name: "bubbleState",
  initialState: bubbleState,
  reducers: {
    deleteBubble: (state, action: PayloadAction<string>) => {
      const proc = BubblesProcess.fromJSON(state.bubblesProcess);
      const next = proc.deleteBubble(action.payload);
      state.bubblesProcess = next.toJSON();
    },
    layerDown: (state, action: PayloadAction<string>) => {
      const proc = BubblesProcess.fromJSON(state.bubblesProcess);
      const next = proc.layerDown(action.payload);
      state.bubblesProcess = next.toJSON();
    },
    layerUp: (state, action: PayloadAction<string>) => {
      const proc = BubblesProcess.fromJSON(state.bubblesProcess);
      const next = proc.layerUp(action.payload);
      state.bubblesProcess = next.toJSON();
    },
    moveTo: (
      state,
      action: PayloadAction<{ id: string; position: { x: number; y: number } }>
    ) => {
      const proc = BubblesProcess.fromJSON(state.bubblesProcess);
      const next = proc.moveTo(action.payload.id, action.payload.position);
      state.bubblesProcess = next.toJSON();
    },
    popChild: {
      reducer: (state, action: PayloadAction<BubbleState>) => {
        const proc = BubblesProcess.fromJSON(state.bubblesProcess);
        const bubble = Bubble.fromJSON(action.payload);
        const next = proc.popChild(bubble);
        state.bubblesProcess = next.toJSON();
      },
      prepare: (bubble: Bubble) => ({ payload: bubble.toJSON() }),
    },
    joinSibling: {
      reducer: (state, action: PayloadAction<BubbleState>) => {
        const proc = BubblesProcess.fromJSON(state.bubblesProcess);
        const bubble = Bubble.fromJSON(action.payload);
        const next = proc.joinSibling(bubble);
        state.bubblesProcess = next.toJSON();
      },
      prepare: (bubble: Bubble) => ({ payload: bubble.toJSON() }),
    },
    renameBubble: (
      state,
      action: PayloadAction<{ id: string; newName: string }>
    ) => {
      const proc = BubblesProcess.fromJSON(state.bubblesProcess);
      const next = proc.renameBubble(action.payload.id, action.payload.newName);
      state.bubblesProcess = next.toJSON();
    },
  },
});

export const {
  deleteBubble,
  layerDown,
  layerUp,
  moveTo,
  popChild,
  joinSibling,
  renameBubble,
} = bubblesSlice.actions;

// 外部向けセレクター：BubblesProcess クラスを返す
export const selectBubbles = (
  state: { bubbleState: { bubblesProcess: BubblesProcessState } }
): BubblesProcess => {
  return BubblesProcess.fromJSON(state.bubbleState.bubblesProcess);
};
