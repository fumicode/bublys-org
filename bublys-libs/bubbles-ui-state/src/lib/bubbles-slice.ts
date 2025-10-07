import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Bubble, BubblesProcess, BubbleState } from "@bublys-org/bubbles-ui"

// Redux ストアに保持する型（純粋なプレーンオブジェクトの二次元配列）
export type BubblesProcessState = BubbleState[][];

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
      //state は writable な状態なので、直接変更して良い
      const id = action.payload;

      state.bubblesProcess = state.bubblesProcess
        .map((layer) => layer.filter((bubble) => bubble.id !== id))
        .filter((layer) => layer.length > 0);
    },
    layerDown: (state, action: PayloadAction<string>) => {
      //state は writable な状態なので、直接変更して良い

      const id = action.payload;
      const layerIdx = state.bubblesProcess.findIndex((layer) =>
        layer.some((bubble) => bubble.id === id)
      );
      if (layerIdx < 0 || layerIdx >= state.bubblesProcess.length - 1) return;
      const bubbleIdx = state.bubblesProcess[layerIdx].findIndex(
        (bubble) => bubble.id === id
      );
      if (bubbleIdx < 0) return;

      const [bubble] = state.bubblesProcess[layerIdx].splice(bubbleIdx, 1);
      state.bubblesProcess[layerIdx + 1].push(bubble);
    },
    layerUp: (state, action: PayloadAction<string>) => {
      //state は writable な状態なので、直接変更して良い
      const id = action.payload;
      const layerIdx = state.bubblesProcess.findIndex((layer) =>
        layer.some((bubble) => bubble.id === id)
      );
      if (layerIdx <= 0) return;
      const bubbleIdx = state.bubblesProcess[layerIdx].findIndex(
        (bubble) => bubble.id === id
      );
      if (bubbleIdx < 0) return;

      const [bubble] = state.bubblesProcess[layerIdx].splice(bubbleIdx, 1);
      if (state.bubblesProcess[layerIdx].length === 0) {
        state.bubblesProcess.splice(layerIdx, 1);
      }
      state.bubblesProcess[layerIdx - 1].push(bubble);
    },
    moveTo: (
      state,
      action: PayloadAction<{ id: string; position: { x: number; y: number } }>
    ) => {
      //state は writable な状態なので、直接変更して良い

      const id = action.payload.id;
      const bubble = findBubbleFromRepo(state.bubblesProcess, id);
      if (!bubble) return;

      const movedBubble = bubble.moveTo(action.payload.position);

      state.bubblesProcess = state.bubblesProcess.map((layer) =>
        layer.map((bubble) =>
          bubble.id === id ? movedBubble.toJSON() : bubble
        )
      );
    },
    popChild: {
      reducer: (state, action: PayloadAction<BubbleState>) => {
        //state は writable な状態なので、直接変更して良い
        state.bubblesProcess.unshift([action.payload]);
      },
      prepare: (bubble: Bubble) => ({ payload: bubble.toJSON() }),
    },
    joinSibling: {
      reducer: (state, action: PayloadAction<BubbleState>) => {
        //state は writable な状態なので、直接変更して良い

        const bubbleState = action.payload;

        if (state.bubblesProcess.length === 0) {
          state.bubblesProcess.push([bubbleState]);
        } else {
          state.bubblesProcess[0].push(bubbleState);
        }
      },
      prepare: (bubble: Bubble) => ({ payload: bubble.toJSON() }),
    },
    renameBubble: (
      state,
      action: PayloadAction<{ id: string; newName: string }>
    ) => {
      const bubble = findBubbleFromRepo(
        state.bubblesProcess,
        action.payload.id
      );
      if (!bubble) return;

      const id = action.payload.id;
      const renamedBubble = bubble.rename(action.payload.newName);

      state.bubblesProcess = state.bubblesProcess.map((layer) =>
        layer.map((bubble) =>
          bubble.id === id ? renamedBubble.toJSON() : bubble
        )
      );
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

// 外部向けセレクター：保存されたプレーンオブジェクトをクラスインスタンスに変換して返す
export const selectBubbles = (state: { bubbleState: { bubblesProcess: BubblesProcessState } } ): BubblesProcess => {
  const ret = state.bubbleState.bubblesProcess.map((layer) =>
    layer.map((bubbleState) => Bubble.fromJSON(bubbleState))
  );
  return ret;
};

export const findBubbleFromRepo = (
  state: BubblesProcessState,
  id: string
): Bubble | undefined => {
  const bubblesState = state;
  for (const layer of bubblesState) {
    for (const bubbleState of layer) {
      if (bubbleState.id === id) {
        return Bubble.fromJSON(bubbleState);
      }
    }
  }
  return undefined;
};
