import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

export type MemoBlock = {
  id: string;
  type: string;
  content: string;
};
 
export type RawMemo = {
  id: string;
  blocks: {
    [key: string]: MemoBlock;
  };
  lines: string[];
};

// Define a type for the slice state
export interface MemoState {
  memos: Record<string, RawMemo>;
}

export class Memo {
  readonly state: RawMemo;
  constructor(state: RawMemo) {
    this.state = { id: state.id, blocks: { ...state.blocks }, lines: [...state.lines] };
  }
  static from(state: RawMemo): Memo {
    return new Memo(state);
  }
  insertTextBlockAfter(afterId: string, newBlock: { id: string; type: string; content: string }): Memo {
    const { id, blocks, lines } = this.state;
    const newBlocks = { ...blocks, [newBlock.id]: newBlock };
    const newLines = [...lines];
    const idx = newLines.findIndex((bid) => bid === afterId);
    newLines.splice(idx + 1, 0, newBlock.id);
    return new Memo({ id, blocks: newBlocks, lines: newLines });
  }
  updateBlockContent(blockId: string, content: string): Memo {
    const { id, blocks, lines } = this.state;
    const newBlocks = { ...blocks };
    if (newBlocks[blockId]) {
      newBlocks[blockId] = { ...newBlocks[blockId], content };
    }
    return new Memo({ id, blocks: newBlocks, lines: [...lines] });
  }
  mergeBlock(blockId: string): Memo {
    const { id, blocks, lines } = this.state;
    const newBlocks = { ...blocks };
    const newLines = [...lines];
    const idx = newLines.findIndex((bid) => bid === blockId);
    if (idx <= 0) return this;
    const prevId = newLines[idx - 1];
    newBlocks[prevId] = { ...newBlocks[prevId], content: newBlocks[prevId].content + newBlocks[blockId].content };
    delete newBlocks[blockId];
    newLines.splice(idx, 1);
    return new Memo({ id, blocks: newBlocks, lines: newLines });
  }
  toPlain(): RawMemo {
    return { ...this.state };
  }
}

// Define the initial state using that type
const initialState: MemoState = {
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
    },
    deleteMemo: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.memos[id];
    },
  },
});

export const { addMemo, updateMemo, deleteMemo } = memoSlice.actions;

export const selectMemos = (state: RootState) => state.memo.memos;
export const selectMemo = (id: string) => (state: RootState) => state.memo.memos[id];
