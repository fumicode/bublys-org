/**
 * 世界線の文脈（React Context）。
 *
 * ★ **ここは domain ではない**（2026-09-26 に `domain/` から移した）。
 *   `createContext` は React のもので、domain は何にも依存しない層だから。
 * ★ 置き場所が `feature/` ではなく `ui/` なのは、**依存の向き**のため
 *   ── 消費するのは ui（`WorldLineView`）、値を配るのは feature（`WorldLineManager`）。
 *   feature に置くと ui → feature の逆流になる。ui に置けば feature → ui → domain のまま
 *   （CLAUDE.md：ui は「コンテキストを消費」、feature は「コンテキストプロバイダー」）。
 */
import { createContext } from "react";
import { World } from "../domain/World";

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
  initialize: () => void;
  
  // 初期化状態
  isInitializing: boolean;
  isInitialized: boolean;

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
