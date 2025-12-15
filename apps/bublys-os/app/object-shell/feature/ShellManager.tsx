/**
 * ShellManager
 * オブジェクトシェルをメモリ上で管理するContext Provider
 *
 * useReducerベースで、Reduxライクなアクションで操作
 */

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { ObjectShell, type DomainEntity, createObjectShell } from '../domain';
import { useAppDispatch } from '@bublys-org/state-management';
import { shellTypeRegistry } from './ShellTypeRegistry';

// ============================================
// State
// ============================================

interface ShellManagerState {
  shells: Map<string, ObjectShell<any>>;
  // 新規追加: Bubble統合用
  shellTypes: Map<string, string>;  // shellId → typeName
  pendingBubbleCreations: Array<{
    shellId: string;
    shellType: string;
    openerBubbleId: string;
  }>;
}

const initialState: ShellManagerState = {
  shells: new Map(),
  shellTypes: new Map(),
  pendingBubbleCreations: [],
};

// ============================================
// Actions
// ============================================

type ShellManagerAction =
  | { type: 'SET_SHELL'; payload: { id: string; shell: ObjectShell<any> } }
  | { type: 'REMOVE_SHELL'; payload: { id: string } }
  | { type: 'LOAD_SHELLS'; payload: { shells: Map<string, ObjectShell<any>> } }
  | { type: 'CLEAR_ALL' }
  // 新規: Bubble統合用
  | {
      type: 'SET_SHELL_WITH_BUBBLE';
      payload: {
        id: string;
        shell: ObjectShell<any>;
        shellType: string;
        createBubble: boolean;
        openerBubbleId: string;
      }
    }
  | { type: 'MARK_BUBBLE_CREATED'; payload: { shellId: string } };

// ============================================
// Reducer
// ============================================

function shellManagerReducer(
  state: ShellManagerState,
  action: ShellManagerAction
): ShellManagerState {
  switch (action.type) {
    case 'SET_SHELL': {
      const newShells = new Map(state.shells);
      newShells.set(action.payload.id, action.payload.shell);
      return {
        ...state,
        shells: newShells,
      };
    }

    case 'REMOVE_SHELL': {
      const newShells = new Map(state.shells);
      const newTypes = new Map(state.shellTypes);
      newShells.delete(action.payload.id);
      newTypes.delete(action.payload.id);
      return {
        ...state,
        shells: newShells,
        shellTypes: newTypes,
      };
    }

    case 'LOAD_SHELLS': {
      return {
        ...state,
        shells: new Map(action.payload.shells),
      };
    }

    case 'CLEAR_ALL': {
      return {
        shells: new Map(),
        shellTypes: new Map(),
        pendingBubbleCreations: [],
      };
    }

    case 'SET_SHELL_WITH_BUBBLE': {
      const { id, shell, shellType, createBubble, openerBubbleId } = action.payload;
      const newShells = new Map(state.shells);
      const newTypes = new Map(state.shellTypes);
      newShells.set(id, shell);
      newTypes.set(id, shellType);

      return {
        ...state,
        shells: newShells,
        shellTypes: newTypes,
        pendingBubbleCreations: createBubble
          ? [...state.pendingBubbleCreations, { shellId: id, shellType, openerBubbleId }]
          : state.pendingBubbleCreations,
      };
    }

    case 'MARK_BUBBLE_CREATED': {
      return {
        ...state,
        pendingBubbleCreations: state.pendingBubbleCreations.filter(
          p => p.shellId !== action.payload.shellId
        ),
      };
    }

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

interface ShellManagerContextType {
  // State
  shells: Map<string, ObjectShell<any>>;

  // アクション
  setShell: <T extends DomainEntity>(id: string, shell: ObjectShell<T>) => void;
  removeShell: (id: string) => void;
  clearAll: () => void;

  // クエリ
  getShell: <T extends DomainEntity>(id: string) => ObjectShell<T> | undefined;
  getAllShellIds: () => string[];
  hasShell: (id: string) => boolean;

  // 永続化
  saveToStorage: () => void;
  loadFromStorage: () => void;

  // 新規: Bubble統合用
  setShellWithBubble: <T extends DomainEntity>(
    id: string,
    shell: ObjectShell<T>,
    options: {
      shellType: string;
      createBubble?: boolean;    // デフォルト true
      openerBubbleId?: string;   // デフォルト 'root'
    }
  ) => void;
  getShellByBubbleUrl: (url: string) => ObjectShell<any> | undefined;
  getShellType: (shellId: string) => string | undefined;
}

const ShellManagerContext = createContext<ShellManagerContextType | null>(null);

// ============================================
// Provider
// ============================================

export function ShellManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shellManagerReducer, initialState);
  const reduxDispatch = useAppDispatch();  // Redux dispatch for Bubble creation

  // Actions
  const setShell = useCallback(<T extends DomainEntity>(id: string, shell: ObjectShell<T>) => {
    dispatch({ type: 'SET_SHELL', payload: { id, shell } });
  }, []);

  // 新規: Bubble統合用
  const setShellWithBubble = useCallback(<T extends DomainEntity>(
    id: string,
    shell: ObjectShell<T>,
    options: {
      shellType: string;
      createBubble?: boolean;
      openerBubbleId?: string;
    }
  ) => {
    dispatch({
      type: 'SET_SHELL_WITH_BUBBLE',
      payload: {
        id,
        shell,
        shellType: options.shellType,
        createBubble: options.createBubble ?? true,
        openerBubbleId: options.openerBubbleId ?? 'root',
      },
    });
  }, []);

  const removeShell = useCallback((id: string) => {
    const shellType = state.shellTypes.get(id);
    dispatch({ type: 'REMOVE_SHELL', payload: { id } });

    // Bubble削除イベントをディスパッチ
    if (shellType) {
      reduxDispatch({ type: 'shells/deleted', payload: { shellId: id, shellType } });
    }
  }, [state.shellTypes, reduxDispatch]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  // Queries
  const getShell = useCallback(
    <T extends DomainEntity>(id: string): ObjectShell<T> | undefined => {
      return state.shells.get(id) as ObjectShell<T> | undefined;
    },
    [state.shells]
  );

  const getAllShellIds = useCallback(() => {
    return Array.from(state.shells.keys());
  }, [state.shells]);

  const hasShell = useCallback(
    (id: string) => {
      return state.shells.has(id);
    },
    [state.shells]
  );

  // 新規: Bubble統合用クエリ
  const getShellByBubbleUrl = useCallback((url: string) => {
    // URL: object-shells/counter/shell-counter-001
    const match = url.match(/^object-shells\/[^/]+\/(.+)$/);
    if (!match) return undefined;
    const shellId = match[1];
    return state.shells.get(shellId);
  }, [state.shells]);

  const getShellType = useCallback((shellId: string) => {
    return state.shellTypes.get(shellId);
  }, [state.shellTypes]);

  // 永続化
  const saveToStorage = useCallback(() => {
    try {
      const serialized = Array.from(state.shells.entries()).map(([id, shell]) => {
        const shellType = state.shellTypes.get(id) || 'unknown';

        // ドメインオブジェクトのシリアライザを動的に選択
        const domainSerializer = (obj: any) => {
          if (obj.toJson) return obj.toJson();
          return obj;
        };

        // BaseShell の場合は関連IDも含めて保存
        const shellData = 'toJsonWithRelations' in shell
          ? (shell as any).toJsonWithRelations(domainSerializer, domainSerializer)
          : { domainData: shell.toJson(domainSerializer, domainSerializer), relationIds: {} };

        return {
          id,
          shellType,
          domainData: shellData.domainData,
          relationIds: shellData.relationIds,
        };
      });

      localStorage.setItem('object-shells', JSON.stringify(serialized));
      console.log(`💾 Saved ${serialized.length} shells to storage`);
    } catch (error) {
      console.error('Failed to save shells:', error);
    }
  }, [state.shells, state.shellTypes]);

  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('object-shells');
      if (!stored) {
        console.log('No shells found in storage');
        return;
      }

      const serialized = JSON.parse(stored);
      const newShells = new Map<string, ObjectShell<any>>();
      const newShellTypes = new Map<string, string>();
      const baseShells = new Map<string, any>();  // BaseShell のマップ（関連復元用）
      const relationData: Array<{ shell: any; relationIds: Record<string, string[]> }> = [];

      // パス1: すべてのShellを作成（関連なし）
      serialized.forEach(({ id, shellType, domainData, relationIds }: any) => {
        // ShellTypeRegistry から設定を取得
        const config = shellTypeRegistry.get(shellType);
        if (!config) {
          console.warn(`Unknown shell type: ${shellType}, skipping shell ${id}`);
          return;
        }

        // ShellClass.fromJson を使って型特化 Shell を作成（BaseShell を返す）
        const baseShell = config.ShellClass.fromJson(
          domainData,
          config.deserializer,
          config.deserializer
        );

        // Proxy でラップして ObjectShell にする
        const shell = createObjectShell(baseShell);

        newShells.set(id, shell);
        baseShells.set(id, baseShell);  // BaseShell も保存
        newShellTypes.set(id, shellType);

        // 関連情報があれば記録（BaseShell を渡す）
        if (relationIds && Object.keys(relationIds).length > 0) {
          relationData.push({ shell: baseShell, relationIds });
        }
      });

      // パス2: 関連を復元（BaseShellの場合のみ）
      relationData.forEach(({ shell, relationIds }) => {
        if ('restoreRelations' in shell && typeof shell.restoreRelations === 'function') {
          shell.restoreRelations(baseShells, relationIds);
        }
      });

      dispatch({
        type: 'LOAD_SHELLS',
        payload: { shells: newShells }
      });

      // shellTypes も復元
      state.shellTypes.clear();
      newShellTypes.forEach((type, id) => {
        state.shellTypes.set(id, type);
      });

      console.log(`📂 Loaded ${newShells.size} shells from storage (${relationData.length} with relations)`);
    } catch (error) {
      console.error('Failed to load shells:', error);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // ページアンロード時に自動保存
  useEffect(() => {
    const handler = () => {
      saveToStorage();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveToStorage]);

  // Bubble自動作成（pendingBubbleCreationsを監視）
  useEffect(() => {
    state.pendingBubbleCreations.forEach((pending) => {
      const { shellId, shellType, openerBubbleId } = pending;
      const url = `object-shells/${shellType}/${shellId}`;

      // Redux にBubble作成リクエストをディスパッチ
      reduxDispatch({
        type: 'bubbles/requestBubbleCreation',
        payload: { url, openerBubbleId },
      });

      // 作成済みフラグを立てる
      dispatch({
        type: 'MARK_BUBBLE_CREATED',
        payload: { shellId }
      });
    });
  }, [state.pendingBubbleCreations, reduxDispatch]);

  return (
    <ShellManagerContext.Provider
      value={{
        shells: state.shells,
        setShell,
        removeShell,
        clearAll,
        getShell,
        getAllShellIds,
        hasShell,
        saveToStorage,
        loadFromStorage,
        setShellWithBubble,
        getShellByBubbleUrl,
        getShellType,
      }}
    >
      {children}
    </ShellManagerContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

export function useShellManager() {
  const context = useContext(ShellManagerContext);
  if (!context) {
    throw new Error('useShellManager must be used within ShellManagerProvider');
  }
  return context;
}

/**
 * 特定のシェルを取得するフック
 */
export function useShell<T extends DomainEntity>(shellId: string | undefined): ObjectShell<T> | undefined {
  const { getShell } = useShellManager();
  return shellId ? getShell<T>(shellId) : undefined;
}

/**
 * シェルを更新するフック（便利関数）
 */
export function useShellUpdater<T extends DomainEntity>(shellId: string | undefined) {
  const { getShell, setShell } = useShellManager();

  return useCallback(
    (updater: (shell: ObjectShell<T>) => ObjectShell<T>) => {
      if (!shellId) return;

      const shell = getShell<T>(shellId);
      if (!shell) {
        console.warn(`Shell ${shellId} not found`);
        return;
      }

      const newShell = updater(shell);
      setShell(shellId, newShell);
    },
    [shellId, getShell, setShell]
  );
}
