import { createContext } from "react";
import { AkashicRecord } from "./AkashicRecord";
import { World } from "./World";
import { Counter } from "./Counter";

/**
 * WorldLineContext の型定義
 */
export type WorldLineContextType = {
  akashicRecord: AkashicRecord;
  currentWorldId: string;
  currentWorld: World | null;

  // アクション
  addWorldLine: (worldLine: any) => void;
  updateWorldLine: (worldLineId: string, worldLine: any) => void;
  setCurrentWorld: (worldId: string) => void;
  getNextWorldChoices: (worldId: string) => any[];
  updateCounterAndCreateWorld: (worldId: string, newCounter: Counter) => void;
  switchToWorldAndCreateBranch: (targetWorldId: string) => void;
  resetToRootWorld: () => void;
};

/**
 * WorldLineContext のデフォルト値
 */
export const WorldLineContext = createContext<WorldLineContextType>({
  akashicRecord: new AkashicRecord(),
  currentWorldId: '',
  currentWorld: null,

  addWorldLine: () => {
    console.warn("addWorldLine not implemented");
  },
  updateWorldLine: () => {
    console.warn("updateWorldLine not implemented");
  },
  setCurrentWorld: () => {
    console.warn("setCurrentWorld not implemented");
  },
  getNextWorldChoices: () => {
    console.warn("getNextWorldChoices not implemented");
    return [];
  },
  updateCounterAndCreateWorld: () => {
    console.warn("updateCounterAndCreateWorld not implemented");
  },
  switchToWorldAndCreateBranch: () => {
    console.warn("switchToWorldAndCreateBranch not implemented");
  },
  resetToRootWorld: () => {
    console.warn("resetToRootWorld not implemented");
  },
});