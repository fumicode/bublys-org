import { createSlice } from "@reduxjs/toolkit";
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

export const selectMemos = (state: RootState) => {
  //raw memo を class Memo に変換して返す
  //memosがRecord<string, RawMemo>なので、Object.valuesで配列に変換してからmapで変換

  return (
    Object.values(state.memo.memos).map((m) => Memo.fromJson(m))
  )
};

export const selectMemo = (id: string) => (state: RootState) => Memo.fromJson(state.memo.memos[id]);
