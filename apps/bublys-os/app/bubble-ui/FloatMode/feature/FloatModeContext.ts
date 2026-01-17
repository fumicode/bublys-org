"use client";

import { createContext, useContext } from "react";

export type FloatModeContextType = {
  /** FloatModeがアクティブかどうか */
  isActive: boolean;
  /** FloatModeを開始する */
  activateFloatMode: () => void;
  /** FloatModeを終了する（背景クリックやEscで呼ぶ） */
  deactivateFloatMode: () => void;
  /** カーソル位置を更新（FloatMode中のエフェクト用） */
  updateCursorPosition: (x: number, y: number) => void;
};

const defaultContext: FloatModeContextType = {
  isActive: false,
  activateFloatMode: () => {},
  deactivateFloatMode: () => {},
  updateCursorPosition: () => {},
};

export const FloatModeContext = createContext<FloatModeContextType>(defaultContext);

export const useFloatMode = () => useContext(FloatModeContext);
