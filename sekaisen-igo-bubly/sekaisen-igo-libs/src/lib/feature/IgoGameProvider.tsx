"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import {
  useCasScope,
  createScope as createScopeAction,
  deleteScope as deleteScopeAction,
} from "@bublys-org/world-line-graph";
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";
import { useAppDispatch } from "@bublys-org/state-management";
import {
  IgoGame_囲碁ゲーム,
  type IgoGameState_囲碁ゲーム状態,
} from "@bublys-org/sekaisen-igo-model";

// ============================================================================
// Game scope prefix
// ============================================================================

const GAME_SCOPE_PREFIX = "igo-game-";

export function gameScopeId(gameId: string): string {
  return `${GAME_SCOPE_PREFIX}${gameId}`;
}

// ============================================================================
// Domain Objects — 全型のシリアライズ/デシリアライズ設定を1箇所で定義
// ============================================================================

const IGO_DOMAIN_OBJECTS = defineDomainObjects({
  "igo-game": {
    class: IgoGame_囲碁ゲーム,
    fromJSON: (json) => IgoGame_囲碁ゲーム.fromJSON(json as IgoGameState_囲碁ゲーム状態),
    toJSON: (g: IgoGame_囲碁ゲーム) => g.toJSON(),
    getId: (g: IgoGame_囲碁ゲーム) => g.state.id,
  },
  "game-meta": {
    class: Object,
    fromJSON: (json) => json as GameMeta,
    toJSON: (obj: GameMeta) => obj,
    getId: (obj: GameMeta) => obj.id,
  },
});

// ============================================================================
// Game meta — グローバルWLGで「対局の存在」を管理するための型
// ============================================================================

interface GameMeta {
  id: string;
}

// ============================================================================
// Context — 内部実装。公開 API はフック経由
// ============================================================================

interface IgoGameContextValue {
  gameIds: string[];
  addGame: (id: string) => void;
  deleteGame: (id: string) => void;
}

const IgoGameContext = createContext<IgoGameContextValue | null>(null);

// ============================================================================
// Inner Provider — CasProvider の内側で動作
// ============================================================================

function IgoGameInner({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  // グローバルスコープ: GameMeta を管理
  const scope = useCasScope("sekaisen-igo");

  const gameMetaShells = scope.shells<GameMeta>("game-meta");

  const gameIds = useMemo(
    () => gameMetaShells.map((s) => s.id),
    [gameMetaShells]
  );

  // 対局作成: グローバルWLGに meta を追加 + ローカルWLGスコープを作成
  const addGame = useCallback(
    (id: string) => {
      scope.addObject("game-meta", { id });
      dispatch(createScopeAction(gameScopeId(id)));
    },
    [scope, dispatch]
  );

  // 対局削除: グローバルWLGから meta を tombstone + ローカルWLGスコープを削除
  const deleteGame = useCallback(
    (id: string) => {
      scope.removeObject("game-meta", id);
      dispatch(deleteScopeAction(gameScopeId(id)));
    },
    [scope, dispatch]
  );

  const value = useMemo<IgoGameContextValue>(
    () => ({
      gameIds,
      addGame,
      deleteGame,
    }),
    [gameIds, addGame, deleteGame]
  );

  return (
    <IgoGameContext.Provider value={value}>
      {children}
    </IgoGameContext.Provider>
  );
}

// ============================================================================
// Provider — DomainRegistryProvider でラップ
// ============================================================================

export function IgoGameProvider({ children }: { children: React.ReactNode }) {
  return (
    <DomainRegistryProvider registry={IGO_DOMAIN_OBJECTS}>
      <IgoGameInner>{children}</IgoGameInner>
    </DomainRegistryProvider>
  );
}

// ============================================================================
// Hooks — 公開 API
// ============================================================================

function useContextValue(): IgoGameContextValue {
  const context = useContext(IgoGameContext);
  if (!context) {
    throw new Error("useIgoGame must be used within an IgoGameProvider");
  }
  return context;
}

/**
 * 囲碁ゲームアプリのグローバル状態
 */
export function useIgoGame(): IgoGameContextValue {
  return useContextValue();
}
