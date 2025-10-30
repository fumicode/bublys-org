import { createContext } from "react";
import { World } from "./World";

/**
 * WorldLineContext の型定義(ジェネリック版)
 */
export type WorldLineContextType<TWorldState> = {
  apexWorld: World<TWorldState> | null;
  apexWorldId: string | null;
  
  // ヘルパー関数
  getAllWorlds: () => World<TWorldState>[];
  getWorldTree: () => { [worldId: string]: string[] };
  
  // アクション
  grow: (newWorldState: TWorldState) => void;
  setApex: (worldId: string) => void;
  regrow: () => void; 
  showAllWorldLines: () => void;

  // モーダル関連
  isModalOpen: boolean;
  closeModal: () => void;
};

/**
 * WorldLineContext のデフォルト値
 */
export const WorldLineContext = createContext<WorldLineContextType<any>>({
  apexWorld: null,
  apexWorldId: null,

  grow: () => {
    console.warn("grow not implemented");
  },
  setApex: () => {
    console.warn("setApex not implemented");
  },
  regrow: () => {
    console.warn("regrow not implemented");
  },
  showAllWorldLines: () => {
    console.warn("showAllWorldLines not implemented");
  },
  getAllWorlds: () => {
    console.warn("getAllWorlds not implemented");
    return [];
  },
  getWorldTree: () => {
    console.warn("getWorldTree not implemented");
    return {};
  },
  isModalOpen: false,
  closeModal: () => {
    console.warn("closeModal not implemented");
  },
});
