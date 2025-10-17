import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

/**
 * WorldLineGitState - シリアライズ可能な状態の型定義
 * ジェネリックな設計により、任意のWorldState型を管理可能
 * 
 * world: any は WorldLineGit<TWorldState>.toJson() の結果を格納
 * 実際の型はアプリケーション層で定義される（例：CounterWorldState）
 */
export interface WorldLineGitState {
  worlds: Array<{ id: string; world: any }>; // world.worldState に任意の型が含まれる
  headWorldId: string | null;
  rootWorldId: string | null;
}

// 世界線の状態を定義
export interface WorldLineState {
  worldLineGit: WorldLineGitState | null;
  operationHistory: string[];
}

// 初期状態
const initialState: WorldLineState = {
  worldLineGit: null,
  operationHistory: [],
};

export const worldSlice = createSlice({
  name: "worldLine",
  initialState,
  reducers: {
    // 初期化アクション
    initialize: (state, action: PayloadAction<WorldLineGitState>) => {
      state.worldLineGit = action.payload;
      state.operationHistory.push('initialize');
    },

    // 状態更新アクション（汎用的）
    updateState: (state, action: PayloadAction<{ newWorldLineGit: WorldLineGitState; operation: string }>) => {
      const { newWorldLineGit, operation } = action.payload;
      state.worldLineGit = newWorldLineGit;
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
export const selectWorldLineGit = (state: RootState) => state.worldLine.worldLineGit;
export const selectHeadWorld = (state: RootState) => {
  const worldLineGit = state.worldLine.worldLineGit;
  if (!worldLineGit || !worldLineGit.headWorldId) return null;
  const worldEntry = worldLineGit.worlds.find(w => w.id === worldLineGit.headWorldId);
  return worldEntry ? worldEntry.world : null;
};
export const selectOperationHistory = (state: RootState) => state.worldLine.operationHistory;
