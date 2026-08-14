"use client";
import { createContext, useContext, RefObject } from "react";
import { ROOT_UNIVERSE_ID } from "../state/bubbles-slice.js";

export type UniverseContextType = {
  /** この universe の ID（root or ネストした universe のパス） */
  universeId: string;
  universeRef: RefObject<HTMLDivElement | null>;
};

export const UniverseContext = createContext<UniverseContextType | null>(null);

export const useUniverseContext = (): UniverseContextType | null => {
  return useContext(UniverseContext);
};

/**
 * 現在の universe ID を返す（Provider 外なら root）。
 * セレクタ/アクションを universe スコープに束ねるのに使う。
 */
export const useUniverseId = (): string => {
  return useContext(UniverseContext)?.universeId ?? ROOT_UNIVERSE_ID;
};
