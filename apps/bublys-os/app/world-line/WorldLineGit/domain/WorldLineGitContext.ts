import { createContext } from "react";
import { World } from "./World";

/**
 * WorldLineGitContext の型定義（ジェネリック版）
 * 任意のWorldStateを管理可能
 */
export type WorldLineGitContextType<TWorldState = any> = {
  currentWorld: World<TWorldState> | null;
  currentWorldId: string | null;

  // アクション
  updateWorldState: (newWorldState: TWorldState) => void;
  checkout: (worldId: string) => void;
  undo: () => void; // Ctrl+Shift+Z: 現在の世界線で子要素に移動
  showAllWorldLines: () => void; // Ctrl+z: 全ての世界線を表示
  initialize: () => void; // 初期化
  
  // ヘルパー関数
  getAllWorlds: () => World<TWorldState>[];
  getWorldTree: () => { [worldId: string]: string[] };
  
  // モーダル関連
  isModalOpen: boolean;
  closeModal: () => void;
  
  // 初期化状態
  isInitializing: boolean;
  isInitialized: boolean;
};

/**
 * WorldLineGitContext のデフォルト値
 */
export const WorldLineGitContext = createContext<WorldLineGitContextType<any>>({
  currentWorld: null,
  currentWorldId: null,

  updateWorldState: () => {
    console.warn("updateWorldState not implemented");
  },
  checkout: () => {
    console.warn("checkout not implemented");
  },
  undo: () => {
    console.warn("undo not implemented");
  },
  showAllWorldLines: () => {
    console.warn("showAllWorldLines not implemented");
  },
  initialize: () => {
    console.warn("initialize not implemented");
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
  isInitializing: false,
  isInitialized: false,
});
