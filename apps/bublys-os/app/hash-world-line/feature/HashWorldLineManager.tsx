'use client';

/**
 * HashWorldLineManager
 * 世界線の管理を行う Context Provider
 *
 * 機能:
 * - メモリ上の世界線を useReducer で管理
 * - アクティブな世界線の切り替え
 * - IndexedDB との同期（自動保存/ロード）
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { HashWorldLine } from '../domain/HashWorldLine';
import { createStateSnapshot } from '../domain/StateSnapshot';
import { computeObjectHash } from '../domain/hashUtils';
import {
  saveWorldLine,
  loadWorldLine,
  listWorldLines,
  deleteWorldLine as deleteWorldLineFromDB,
  saveState,
  loadState,
} from './IndexedDBStore';

// ============================================================================
// State と Action の定義
// ============================================================================

interface HashWorldLineManagerState {
  /** 読み込み済みの世界線 */
  worldLines: Map<string, HashWorldLine>;
  /** アクティブな世界線のID */
  activeWorldLineId: string | null;
  /** 世界線一覧（ID と名前のみ） */
  worldLineList: Array<{ id: string; name: string }>;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラー */
  error: string | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_WORLD_LINE_LIST'; payload: Array<{ id: string; name: string }> }
  | { type: 'SET_WORLD_LINE'; payload: HashWorldLine }
  | { type: 'SET_ACTIVE_WORLD_LINE_ID'; payload: string | null }
  | { type: 'REMOVE_WORLD_LINE'; payload: string };

function reducer(
  state: HashWorldLineManagerState,
  action: Action
): HashWorldLineManagerState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_WORLD_LINE_LIST':
      return { ...state, worldLineList: action.payload };
    case 'SET_WORLD_LINE': {
      const newWorldLines = new Map(state.worldLines);
      newWorldLines.set(action.payload.state.id, action.payload);
      const newList = state.worldLineList.some(
        (w) => w.id === action.payload.state.id
      )
        ? state.worldLineList.map((w) =>
            w.id === action.payload.state.id
              ? { id: action.payload.state.id, name: action.payload.state.name }
              : w
          )
        : [
            ...state.worldLineList,
            { id: action.payload.state.id, name: action.payload.state.name },
          ];
      return { ...state, worldLines: newWorldLines, worldLineList: newList };
    }
    case 'SET_ACTIVE_WORLD_LINE_ID':
      return { ...state, activeWorldLineId: action.payload };
    case 'REMOVE_WORLD_LINE': {
      const newWorldLines = new Map(state.worldLines);
      newWorldLines.delete(action.payload);
      const newList = state.worldLineList.filter((w) => w.id !== action.payload);
      const newActiveId =
        state.activeWorldLineId === action.payload
          ? null
          : state.activeWorldLineId;
      return {
        ...state,
        worldLines: newWorldLines,
        worldLineList: newList,
        activeWorldLineId: newActiveId,
      };
    }
    default:
      return state;
  }
}

const initialState: HashWorldLineManagerState = {
  worldLines: new Map(),
  activeWorldLineId: null,
  worldLineList: [],
  isLoading: true,
  error: null,
};

// ============================================================================
// Context の定義
// ============================================================================

interface HashWorldLineContextValue {
  /** 状態 */
  state: HashWorldLineManagerState;
  /** アクティブな世界線 */
  activeWorldLine: HashWorldLine | null;
  /** 世界線を作成 */
  createWorldLine: (id: string, name: string) => Promise<HashWorldLine>;
  /** 世界線を読み込み */
  loadWorldLineById: (id: string) => Promise<HashWorldLine | undefined>;
  /** 世界線をアクティブに設定 */
  setActiveWorldLine: (id: string) => Promise<void>;
  /** 世界線を削除 */
  deleteWorldLine: (id: string) => Promise<void>;
  /** オブジェクトの状態を更新 */
  updateObjectState: (
    type: string,
    id: string,
    stateData: unknown,
    userId?: string,
    description?: string
  ) => Promise<void>;
  /** オブジェクトの状態を取得 */
  getObjectState: <T = unknown>(
    type: string,
    id: string
  ) => Promise<T | undefined>;
  /** 世界線を巻き戻す */
  rewindWorldLine: (worldStateHash: string) => Promise<void>;
  /** 世界線の名前を変更 */
  renameWorldLine: (id: string, newName: string) => Promise<void>;
  /** 世界線一覧を再読み込み */
  refreshWorldLineList: () => Promise<void>;
}

const HashWorldLineContext = createContext<HashWorldLineContextValue | null>(
  null
);

// ============================================================================
// Provider コンポーネント
// ============================================================================

interface HashWorldLineProviderProps {
  children: ReactNode;
}

export function HashWorldLineProvider({
  children,
}: HashWorldLineProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 初期化：世界線一覧を読み込み
  useEffect(() => {
    const init = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const list = await listWorldLines();
        dispatch({ type: 'SET_WORLD_LINE_LIST', payload: list });
      } catch (e) {
        dispatch({
          type: 'SET_ERROR',
          payload: e instanceof Error ? e.message : 'Unknown error',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    init();
  }, []);

  // 世界線一覧を再読み込み
  const refreshWorldLineList = useCallback(async () => {
    const list = await listWorldLines();
    dispatch({ type: 'SET_WORLD_LINE_LIST', payload: list });
  }, []);

  // 世界線を作成
  const createWorldLine = useCallback(
    async (id: string, name: string): Promise<HashWorldLine> => {
      const worldLine = HashWorldLine.create(id, name);
      await saveWorldLine(worldLine);
      dispatch({ type: 'SET_WORLD_LINE', payload: worldLine });
      return worldLine;
    },
    []
  );

  // 世界線を読み込み
  const loadWorldLineById = useCallback(
    async (id: string): Promise<HashWorldLine | undefined> => {
      // キャッシュを確認
      const cached = state.worldLines.get(id);
      if (cached) return cached;

      // IndexedDB から読み込み
      const worldLine = await loadWorldLine(id);
      if (worldLine) {
        dispatch({ type: 'SET_WORLD_LINE', payload: worldLine });
      }
      return worldLine;
    },
    [state.worldLines]
  );

  // 世界線をアクティブに設定
  const setActiveWorldLine = useCallback(
    async (id: string) => {
      // 読み込まれていなければ読み込み
      let worldLine = state.worldLines.get(id);
      if (!worldLine) {
        worldLine = await loadWorldLine(id);
        if (worldLine) {
          dispatch({ type: 'SET_WORLD_LINE', payload: worldLine });
        }
      }
      dispatch({ type: 'SET_ACTIVE_WORLD_LINE_ID', payload: id });
    },
    [state.worldLines]
  );

  // 世界線を削除
  const deleteWorldLineAction = useCallback(async (id: string) => {
    await deleteWorldLineFromDB(id);
    dispatch({ type: 'REMOVE_WORLD_LINE', payload: id });
  }, []);

  // オブジェクトの状態を更新
  const updateObjectState = useCallback(
    async (
      type: string,
      id: string,
      stateData: unknown,
      userId?: string,
      description?: string
    ) => {
      if (!state.activeWorldLineId) {
        throw new Error('No active world line');
      }

      const worldLine = state.worldLines.get(state.activeWorldLineId);
      if (!worldLine) {
        throw new Error('Active world line not found');
      }

      // ハッシュを計算
      const stateHash = await computeObjectHash(stateData);

      // スナップショットを作成
      const snapshot = createStateSnapshot(type, id, stateHash);

      // 状態を IndexedDB に保存
      await saveState(snapshot, stateData);

      // 世界線を更新
      const updatedWorldLine = await worldLine.updateObjectState(
        snapshot,
        userId,
        description
      );

      // 世界線を IndexedDB に保存
      await saveWorldLine(updatedWorldLine);

      // 状態を更新
      dispatch({ type: 'SET_WORLD_LINE', payload: updatedWorldLine });
    },
    [state.activeWorldLineId, state.worldLines]
  );

  // オブジェクトの状態を取得
  const getObjectState = useCallback(
    async <T = unknown>(
      type: string,
      id: string
    ): Promise<T | undefined> => {
      if (!state.activeWorldLineId) {
        return undefined;
      }

      const worldLine = state.worldLines.get(state.activeWorldLineId);
      if (!worldLine) {
        return undefined;
      }

      const snapshot = worldLine.getCurrentState().getSnapshot(type, id);
      if (!snapshot) {
        return undefined;
      }

      return await loadState<T>(snapshot);
    },
    [state.activeWorldLineId, state.worldLines]
  );

  // 世界線を巻き戻す
  const rewindWorldLine = useCallback(
    async (worldStateHash: string) => {
      if (!state.activeWorldLineId) {
        throw new Error('No active world line');
      }

      const worldLine = state.worldLines.get(state.activeWorldLineId);
      if (!worldLine) {
        throw new Error('Active world line not found');
      }

      const rewound = worldLine.rewindTo(worldStateHash);
      if (!rewound) {
        throw new Error('World state hash not found in history');
      }

      // 世界線を IndexedDB に保存
      await saveWorldLine(rewound);

      // 状態を更新
      dispatch({ type: 'SET_WORLD_LINE', payload: rewound });
    },
    [state.activeWorldLineId, state.worldLines]
  );

  // 世界線の名前を変更
  const renameWorldLine = useCallback(
    async (id: string, newName: string) => {
      const worldLine = state.worldLines.get(id);
      if (!worldLine) {
        const loaded = await loadWorldLine(id);
        if (!loaded) {
          throw new Error('World line not found');
        }
        const renamed = loaded.rename(newName);
        await saveWorldLine(renamed);
        dispatch({ type: 'SET_WORLD_LINE', payload: renamed });
      } else {
        const renamed = worldLine.rename(newName);
        await saveWorldLine(renamed);
        dispatch({ type: 'SET_WORLD_LINE', payload: renamed });
      }
    },
    [state.worldLines]
  );

  // アクティブな世界線
  const activeWorldLine = state.activeWorldLineId
    ? state.worldLines.get(state.activeWorldLineId) ?? null
    : null;

  const value: HashWorldLineContextValue = {
    state,
    activeWorldLine,
    createWorldLine,
    loadWorldLineById,
    setActiveWorldLine,
    deleteWorldLine: deleteWorldLineAction,
    updateObjectState,
    getObjectState,
    rewindWorldLine,
    renameWorldLine,
    refreshWorldLineList,
  };

  return (
    <HashWorldLineContext.Provider value={value}>
      {children}
    </HashWorldLineContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useHashWorldLine(): HashWorldLineContextValue {
  const context = useContext(HashWorldLineContext);
  if (!context) {
    throw new Error(
      'useHashWorldLine must be used within a HashWorldLineProvider'
    );
  }
  return context;
}
