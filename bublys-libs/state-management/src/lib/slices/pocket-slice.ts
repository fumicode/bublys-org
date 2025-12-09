import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

export type PocketItemState = {
  id: string;
  url: string;
  type:
    | 'type/user'
    | 'type/users'
    | 'type/user-group'
    | 'type/user-groups'
    | 'type/memo'
    | 'type/memos'
    | 'type/generic';
  label?: string;
  icon?: string;
  addedAt: number;
};

type PocketState = {
  items: PocketItemState[];
};

const initialState: PocketState = {
  items: [],
};

export const pocketSlice = createSlice({
  name: "pocket",
  initialState,
  reducers: {
    addPocketItem: (state, action: PayloadAction<PocketItemState>) => {
      // 同じURLが既に存在する場合は追加しない
      const exists = state.items.some(item => item.url === action.payload.url);
      if (!exists) {
        state.items.push(action.payload);
      }
    },
    removePocketItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updatePocketItemLabel: (state, action: PayloadAction<{ id: string; label: string }>) => {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item) {
        item.label = action.payload.label;
      }
    },
    clearPocket: (state) => {
      state.items = [];
    },
  },
});

export const { addPocketItem, removePocketItem, updatePocketItemLabel, clearPocket } = pocketSlice.actions;

export const selectPocketItems = (state: RootState) => state.pocket.items;
export const selectPocketItemById = (id: string) => (state: RootState) =>
  state.pocket.items.find((item) => item.id === id);
