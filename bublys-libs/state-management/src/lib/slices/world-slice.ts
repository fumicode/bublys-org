import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

// シリアライズ可能な状態の型定義
export interface WorldLineState {
  worlds: Array<{ id: string; world: any }>;
  apexWorldId: string | null;
  rootWorldId: string | null;
}

// 世界線の状態を定義（複数のオブジェクトを管理）
export interface WorldState {
  // オブジェクトID（counterId, timerIdなど）をキーとして複数の世界線を管理
  worldLines: { [objectId: string]: WorldLineState | null };
  operationHistory: { [objectId: string]: string[] };
}

// 初期状態
const initialState: WorldState = {
  worldLines: {},
  operationHistory: {},
};

export const worldSlice = createSlice({
  name: "worldLine",
  initialState,
  reducers: {
    // 初期化アクション
    initialize: (state, action: PayloadAction<{ objectId: string; worldLine: WorldLineState }>) => {
      const { objectId, worldLine } = action.payload;
      state.worldLines[objectId] = worldLine;
      if (!state.operationHistory[objectId]) {
        state.operationHistory[objectId] = [];
      }
      state.operationHistory[objectId].push('initialize');
    },

    // 状態更新アクション（汎用的）
    updateState: (state, action: PayloadAction<{ objectId: string; newWorldLine: WorldLineState; operation: string }>) => {
      const { objectId, newWorldLine, operation } = action.payload;
      state.worldLines[objectId] = newWorldLine;
      if (!state.operationHistory[objectId]) {
        state.operationHistory[objectId] = [];
      }
      state.operationHistory[objectId].push(operation);
    },
  },
});

// アクションをエクスポート
export const {
  initialize,
  updateState,
} = worldSlice.actions;

// セレクター関数（オブジェクトIDを指定）
export const selectWorldLine = (objectId: string) => (state: RootState) => 
  state.worldLine.worldLines[objectId] || null;

export const selectApexWorld = (objectId: string) => (state: RootState) => {
  const worldLine = state.worldLine.worldLines[objectId];
  if (!worldLine || !worldLine.apexWorldId) return null;
  const worldEntry = worldLine.worlds.find(w => w.id === worldLine.apexWorldId);
  return worldEntry ? worldEntry.world : null;
};

export const selectOperationHistory = (objectId: string) => (state: RootState) => 
  state.worldLine.operationHistory[objectId] || [];
