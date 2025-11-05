import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { Memo, RawMemo } from './Memo';

export interface MemosState {
  memos: Record<string, RawMemo>;
}

const initialState: MemosState = {
  memos: {},
};

const memoSlice = createSlice({
  name: 'memo',
  initialState,
  reducers: {
    addMemo(state, action: PayloadAction<{ memo: RawMemo }>) {
      const { memo } = action.payload;
      state.memos[memo.id] = memo;
    },
    updateMemo(state, action: PayloadAction<{ memo: RawMemo }>) {
      const { memo } = action.payload;
      if (state.memos[memo.id]) {
        state.memos[memo.id] = memo;
      } else {
        console.warn(`Memo with id ${memo.id} not found for update.`);
      }
    },
    deleteMemo(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.memos[id];
    },
  },
});

export const { addMemo, updateMemo, deleteMemo } = memoSlice.actions;

export const selectMemos = (state: RootState): Memo[] =>
  Object.values(state.memo.memos).map((m) => Memo.fromJson(m));

export const selectMemo = (memoId: string) => (state: RootState): Memo =>
  Memo.fromJson(state.memo.memos[memoId]);

export default memoSlice.reducer;
