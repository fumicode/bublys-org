"use client";
/**
 * **ゲームの器。** ここが「複数立ち上げられる」を支えている。
 *
 * 世界線は二段に分かれる:
 *   グローバル  `henge`              … どのゲームが存在するか（`henge-game-meta`）
 *   ゲームごと  `henge-game-<id>`    … そのゲームの中身。**1 ゲームに 1 本の世界線**
 *
 * ゲームごとに世界線を分けてあるので、戻る・枝分かれは**他のゲームに影響しない**。
 */
import React, { createContext, useCallback, useContext, useMemo } from "react";
import {
  useCasScope,
  createScope as createScopeAction,
  deleteScope as deleteScopeAction,
} from "@bublys-org/world-line-graph";
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";
import { useAppDispatch } from "@bublys-org/state-management";
import {
  HengeGame_化ゲーム,
  type HengeGamePlain_化ゲーム記録,
} from "@bublys-org/henge-model";

/** ゲーム 1 つぶんの世界線スコープ名 */
const GAME_SCOPE_PREFIX = "henge-game-";
export function gameScopeId(gameId: string): string {
  return `${GAME_SCOPE_PREFIX}${gameId}`;
}

/** 存在するゲームの一覧を置くグローバルスコープ */
const GLOBAL_SCOPE_ID = "henge";

/** 世界線に載る型の名前。器の都合の型なので、ゲーム本体とは別に持つ */
export const HENGE_GAME_TYPE = "henge-game";
export const HENGE_GAME_META_TYPE = "henge-game-meta";

/** 「このゲームが在る」とだけ言う札。中身はゲームごとの世界線にある */
interface HengeGameMeta {
  id: string;
}

/**
 * 型ごとの出し入れを 1 箇所で定義する。
 * クラス側の名前は `toPlain` / `fromPlain`（CLAUDE.md）、レジストリの口は
 * `toJSON` / `fromJSON` なので、ここで橋渡しする。
 */
const HENGE_DOMAIN_OBJECTS = defineDomainObjects({
  [HENGE_GAME_TYPE]: {
    class: HengeGame_化ゲーム,
    fromJSON: (json) => HengeGame_化ゲーム.fromPlain(json as HengeGamePlain_化ゲーム記録),
    toJSON: (g: HengeGame_化ゲーム) => g.toPlain(),
    getId: (g: HengeGame_化ゲーム) => g.state.id,
  },
  [HENGE_GAME_META_TYPE]: {
    class: Object,
    fromJSON: (json) => json as HengeGameMeta,
    toJSON: (obj: HengeGameMeta) => obj,
    getId: (obj: HengeGameMeta) => obj.id,
  },
});

interface HengeGameContextValue {
  gameIds: string[];
  addGame: (id: string) => void;
  deleteGame: (id: string) => void;
}

const HengeGameContext = createContext<HengeGameContextValue | null>(null);

function HengeGameInner({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const scope = useCasScope(GLOBAL_SCOPE_ID);

  const metaShells = scope.shells<HengeGameMeta>(HENGE_GAME_META_TYPE);
  const gameIds = useMemo(() => metaShells.map((s) => s.id), [metaShells]);

  /** 作る: 一覧に札を足し、そのゲーム専用の世界線を立てる */
  const addGame = useCallback(
    (id: string) => {
      scope.addObject(HENGE_GAME_META_TYPE, { id });
      dispatch(createScopeAction(gameScopeId(id)));
    },
    [scope, dispatch],
  );

  /** 消す: 札を墓石にし、そのゲームの世界線ごと落とす */
  const deleteGame = useCallback(
    (id: string) => {
      scope.removeObject(HENGE_GAME_META_TYPE, id);
      dispatch(deleteScopeAction(gameScopeId(id)));
    },
    [scope, dispatch],
  );

  const value = useMemo<HengeGameContextValue>(
    () => ({ gameIds, addGame, deleteGame }),
    [gameIds, addGame, deleteGame],
  );

  return <HengeGameContext.Provider value={value}>{children}</HengeGameContext.Provider>;
}

export function HengeGameProvider({ children }: { children: React.ReactNode }) {
  return (
    <DomainRegistryProvider registry={HENGE_DOMAIN_OBJECTS}>
      <HengeGameInner>{children}</HengeGameInner>
    </DomainRegistryProvider>
  );
}

export function useHengeGame(): HengeGameContextValue {
  const context = useContext(HengeGameContext);
  if (!context) {
    throw new Error("useHengeGame は HengeGameProvider の中で使ってください");
  }
  return context;
}
