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
export interface MemosState {
  memos: Record<string, RawMemo>;
}

export class Memo {
  readonly state: RawMemo;
  constructor(state: RawMemo) {
    this.state = { id: state.id, blocks: { ...state.blocks }, lines: [...state.lines] };
  }

  get id(): string {
    return this.state.id;
  }
  
  get blocks(): Record<string, MemoBlock> {
    return this.state.blocks;
  }
  get lines(): string[] {
    return this.state.lines;
  }

  getNextBlockId(currentId: string): string | undefined {
    const idx = this.state.lines.findIndex((id) => id === currentId);
    return idx >= 0 && idx < this.state.lines.length - 1
      ? this.state.lines[idx + 1]
      : undefined;
  }

  getPrevBlockId(currentId: string): string | undefined {
    const idx = this.state.lines.findIndex((id) => id === currentId);
    return idx > 0 ? this.state.lines[idx - 1] : undefined;
  }

  mergeWithPrevious(blockId: string): Memo {
    return this.mergeBlock(blockId);
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
    Object.values(state.memo.memos).map((m) => Memo.from(m))
  )
};

export const selectMemo = (id: string) => (state: RootState) => Memo.from(state.memo.memos[id]);
