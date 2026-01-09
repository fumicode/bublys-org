import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";
import { Memo, MemosState, RawMemo } from "./Memo.js";



// Define the initial state using that type
const initialState: MemosState = {
  memos: {}
};

export const memoSlice = createSlice({
  name: "memo",
  initialState,
  reducers: {
    addMemo: (state, action: PayloadAction<{ memo: RawMemo }>) => {
      const { memo } = action.payload;
      state.memos[memo.id] = memo;
    },
    updateMemo: (state, action: PayloadAction<{ memo: RawMemo }>) => {
      const { memo } = action.payload;
      if (state.memos[memo.id]) {
        state.memos[memo.id] = memo;
      }
      else{
        console.warn(`Memo with id ${memo.id} not found for update.`);
      }
    },
    deleteMemo: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.memos[id];
    },
  },
});

export const { addMemo, updateMemo, deleteMemo } = memoSlice.actions;

// 基本セレクター
const selectMemosRaw = (state: RootState) => state.memo.memos;

export const selectMemos = createSelector(
  [selectMemosRaw],
  (memos) => Object.values(memos).map((m) => Memo.fromJson(m))
);

export const selectMemo = (id: string) =>
  createSelector(
    [(state: RootState) => state.memo.memos[id]],
    (memo) => memo ? Memo.fromJson(memo) : undefined
  );
