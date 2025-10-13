import { createContext } from "react";
import { WorldLineGit } from "./WorldLineGit";
import { World } from "./World";
import { Counter } from "./Counter";

/**
 * WorldLineGitContext の型定義
 */
export type WorldLineGitContextType = {
  worldLineGit: WorldLineGit;
  currentWorld: World | null;
  currentWorldId: string | null;

  // アクション
  updateCounter: (newCounter: Counter) => void;
  checkout: (worldId: string) => void;
  createBranch: (fromWorldId: string) => void;
  undo: () => void; // Ctrl+Shift+Z: 現在の世界線で子要素に移動
  showAllWorldLines: () => void; // Ctrl+z: 全ての世界線を表示
  resetToRoot: () => void;
  
  // ヘルパー関数
  getAllWorlds: () => World[];
  getWorldHistory: (worldId: string) => World[];
  getWorldTree: () => { [worldId: string]: string[] };
  
  // モーダル関連
  isModalOpen: boolean;
  closeModal: () => void;
};

/**
 * WorldLineGitContext のデフォルト値
 */
export const WorldLineGitContext = createContext<WorldLineGitContextType>({
  worldLineGit: new WorldLineGit(),
  currentWorld: null,
  currentWorldId: null,

  updateCounter: () => {
    console.warn("updateCounter not implemented");
  },
  checkout: () => {
    console.warn("checkout not implemented");
  },
  createBranch: () => {
    console.warn("createBranch not implemented");
  },
  undo: () => {
    console.warn("undo not implemented");
  },
  showAllWorldLines: () => {
    console.warn("showAllWorldLines not implemented");
  },
  resetToRoot: () => {
    console.warn("resetToRoot not implemented");
  },
  getAllWorlds: () => {
    console.warn("getAllWorlds not implemented");
    return [];
  },
  getWorldHistory: () => {
    console.warn("getWorldHistory not implemented");
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
