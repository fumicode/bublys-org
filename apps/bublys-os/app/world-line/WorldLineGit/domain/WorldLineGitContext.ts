import { createContext } from "react";
import { World } from "./World";
import { Counter } from "./Counter";

/**
 * WorldLineGitContext の型定義
 */
export type WorldLineGitContextType = {
  apexWorld: World | null;
  apexWorldId: string | null;

  // アクション
  grow: (newCounter: Counter) => void; // grow: commit相当 - カウンターを更新して新しい世界を作成
  setApex: (worldId: string) => void; // setApex: checkout相当
  regrow: () => void; // regrow: redo相当 (Ctrl+Shift+Z) - 現在の世界線で子要素に移動
  showAllWorldLines: () => void; // Ctrl+z: 全ての世界線を表示
  initialize: () => void; // 初期化
  
  // ヘルパー関数
  getAllWorlds: () => World[];
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
export const WorldLineGitContext = createContext<WorldLineGitContextType>({
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
