import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";
 
export type Memo = {
  blocks: {
    [key: string]: {
      id: string;
      type: string;
      content: string;
    };
  };

  lines: string[];
}

// Define a type for the slice state
export interface MemoState {
  memos: Record<string, Memo>;
}

const waMemo = "aa"; //crypto.randomUUID()

const enMemo = "bb"; //crypto.randomUUID()


const ichi =  "cc"; //crypto.randomUUID()
const ni = "dd"; //crypto.randomUUID()

const one = "ee"; //crypto.randomUUID()
const two = "ff"; //crypto.randomUUID()

// Define the initial state using that type
const initialState: MemoState = {
  memos: {
    //uuid
    [waMemo]: {
      blocks: {
        [ichi]: { id: ichi, type: "text", content: "これはメモ1の内容です。" },
        [ni]: { id: ni, type: "text", content: "さらに別の内容。" }
      },
      lines: [ichi, ni]
    },
    [enMemo]: {
      blocks: {
        [one]: { id: one, type: "text", content: "これはメモ2の内容です。" },
        [two]: { id: two, type: "text", content: "メモ2の追加情報。" }
      },
      lines: [two, one]
    }

  }
};

export const memoSlice = createSlice({
  name: "memo",
  initialState,
  reducers: {
    addMemo: (state, action: PayloadAction<{ id: string; memo: Memo }>) => {
      const { id, memo } = action.payload;
      state.memos[id] = memo;
    },
    updateMemo: (state, action: PayloadAction<{ id: string; memo: Memo }>) => {
      const { id, memo } = action.payload;
      if (state.memos[id]) {
        state.memos[id] = memo;
      }
    },
    deleteMemo: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.memos[id];
    }
  },
});

export const { addMemo, updateMemo, deleteMemo } = memoSlice.actions;

export const selectMemos = (state: RootState) => state.memo.memos;
export const selectMemo = (id: string) => (state: RootState) => state.memo.memos[id];