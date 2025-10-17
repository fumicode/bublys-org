import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

// シリアライズ可能な状態の型定義
export interface WorldLineState {
  worlds: Array<{ id: string; world: any }>; // WorldLineGit.fromJson()が期待する形式
  apexWorldId: string | null;
  rootWorldId: string | null;
}

// 世界線の状態を定義
export interface WorldState {
  worldLine: WorldLineState | null;
  operationHistory: string[];
}

// 初期状態
const initialState: WorldState = {
  worldLine: null,
  operationHistory: [],
};

export const worldSlice = createSlice({
  name: "worldLine",
  initialState,
  reducers: {
    // 初期化アクション
    initialize: (state, action: PayloadAction<WorldLineState>) => {
      state.worldLine = action.payload;
      state.operationHistory.push('initialize');
    },

    // 状態更新アクション（汎用的）
    updateState: (state, action: PayloadAction<{ newWorldLine: WorldLineState; operation: string }>) => {
      const { newWorldLine, operation } = action.payload;
      state.worldLine = newWorldLine;
      state.operationHistory.push(operation);
    },
  },
});

// アクションをエクスポート
export const {
  initialize,
  updateState,
} = worldSlice.actions;

// セレクター関数
export const selectWorldLine = (state: RootState) => state.worldLine.worldLine;
export const selectApexWorld = (state: RootState) => {
  const worldLine = state.worldLine.worldLine;
  if (!worldLine || !worldLine.apexWorldId) return null;
  const worldEntry = worldLine.worlds.find(w => w.id === worldLine.apexWorldId);
  return worldEntry ? worldEntry.world : null;
};
export const selectOperationHistory = (state: RootState) => state.worldLine.operationHistory;
