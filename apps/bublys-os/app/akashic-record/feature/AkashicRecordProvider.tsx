'use client';

/**
 * AkashicRecordProvider
 * AkashicRecordをReactコンテキストで提供するProvider
 *
 * 責務:
 * - AkashicRecordインスタンスの初期化
 * - 状態変更のReact再レンダリングへの反映
 * - ShellEventEmitterとの連携（自動同期）
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  AkashicRecord,
  getAkashicRecord,
  AkashicRecordEvent,
} from '../domain/AkashicRecord';
import { shellEventEmitter } from '../../object-shell/domain/ShellEventEmitter';
import { serializeDomainObject } from '../../object-shell/domain/Serializable';
import { HashWorldLine } from '../../hash-world-line/domain/HashWorldLine';
import { loadState } from '../../hash-world-line/feature/IndexedDBStore';

// ============================================================================
// Context の定義
// ============================================================================

interface AkashicRecordContextValue {
  /** AkashicRecordインスタンス */
  akashicRecord: AkashicRecord;

  /** 現在アクティブな世界線 */
  activeWorldLine: HashWorldLine | null;

  /** 世界線一覧 */
  worldLineList: ReadonlyArray<{ id: string; name: string }>;

  /** 初期化済みかどうか */
  isInitialized: boolean;

  /** 世界線を作成 */
  createWorldLine: (id: string, name: string) => Promise<HashWorldLine>;

  /** 世界線をアクティブに設定 */
  setActiveWorldLine: (id: string) => Promise<void>;

  /** 世界線を削除 */
  deleteWorldLine: (id: string) => Promise<void>;

  /** 履歴ノードに移動 */
  moveTo: (nodeId: string) => Promise<void>;

  /** 世界線の名前を変更 */
  renameWorldLine: (id: string, newName: string) => Promise<void>;

  /** Shellを自動同期対象に登録 */
  registerShell: (shellId: string, shellType: string) => void;

  /** Shellを自動同期対象から解除 */
  unregisterShell: (shellId: string) => void;

  /** Shellの状態を記録 */
  record: <T extends { id: string }>(
    shell: { id: string; dangerouslyGetDomainObject: () => T },
    shellType: string,
    description?: string
  ) => Promise<void>;
}

const AkashicRecordContext = createContext<AkashicRecordContextValue | null>(
  null
);

// ============================================================================
// Provider コンポーネント
// ============================================================================

interface AkashicRecordProviderProps {
  children: ReactNode;
  /** 初期化完了時にアクティブにする世界線ID */
  initialWorldLineId?: string;
}

export function AkashicRecordProvider({
  children,
  initialWorldLineId,
}: AkashicRecordProviderProps) {
  const [akashicRecord] = useState(() => getAkashicRecord());
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeWorldLine, setActiveWorldLine] = useState<HashWorldLine | null>(
    null
  );
  const [worldLineList, setWorldLineList] = useState<
    ReadonlyArray<{ id: string; name: string }>
  >([]);

  // バージョンカウンター（再レンダリング用）
  const [, setVersion] = useState(0);
  const forceUpdate = useCallback(() => setVersion((v) => v + 1), []);

  // 初期化
  useEffect(() => {
    const init = async () => {
      await akashicRecord.initialize();
      setWorldLineList(akashicRecord.worldLineList);
      setIsInitialized(true);

      // 初期世界線を設定
      if (initialWorldLineId) {
        const wl = await akashicRecord.setActiveWorldLine(initialWorldLineId);
        setActiveWorldLine(wl ?? null);
      }
    };

    init();
  }, [akashicRecord, initialWorldLineId]);

  // AkashicRecordのイベントを購読
  useEffect(() => {
    const unsubscribe = akashicRecord.subscribe((event: AkashicRecordEvent) => {
      switch (event.type) {
        case 'worldLineChanged':
          setActiveWorldLine(event.worldLine);
          setWorldLineList(akashicRecord.worldLineList);
          break;
        case 'stateRecorded':
        case 'moved':
          // 世界線が更新されたので再取得
          setActiveWorldLine(akashicRecord.activeWorldLine);
          forceUpdate();
          break;
      }
    });

    return unsubscribe;
  }, [akashicRecord, forceUpdate]);

  // ShellEventEmitterを購読して自動同期
  useEffect(() => {
    const unsubscribe = shellEventEmitter.subscribe(async (event) => {
      const shellType = akashicRecord.getShellType(event.shellId);
      if (!shellType) {
        return; // 登録されていないShellは無視
      }

      if (!akashicRecord.activeWorldLine) {
        console.warn('[AkashicRecordProvider] No active world line, skipping sync');
        return;
      }

      // ドメインオブジェクトをシリアライズして記録
      const stateData = serializeDomainObject(event.domainObject);

      const { createStateSnapshot } = await import(
        '../../hash-world-line/domain/StateSnapshot'
      );
      const { saveState } = await import(
        '../../hash-world-line/feature/IndexedDBStore'
      );

      const timestamp = Date.now();
      const snapshot = createStateSnapshot(shellType, event.shellId, timestamp);

      await saveState(snapshot, stateData);

      const updated = akashicRecord.activeWorldLine.updateObjectState(
        snapshot,
        event.userId,
        event.description
      );

      // AkashicRecordの内部状態を更新
      await akashicRecord.updateActiveWorldLine(updated);
    });

    return unsubscribe;
  }, [akashicRecord]);

  // ============================================================================
  // Context Value のメソッド
  // ============================================================================

  const createWorldLine = useCallback(
    async (id: string, name: string): Promise<HashWorldLine> => {
      const wl = await akashicRecord.createWorldLine(id, name);
      setWorldLineList(akashicRecord.worldLineList);
      return wl;
    },
    [akashicRecord]
  );

  const setActiveWorldLineAction = useCallback(
    async (id: string): Promise<void> => {
      await akashicRecord.setActiveWorldLine(id);
    },
    [akashicRecord]
  );

  const deleteWorldLineAction = useCallback(
    async (id: string): Promise<void> => {
      await akashicRecord.deleteWorldLine(id);
      setWorldLineList(akashicRecord.worldLineList);
    },
    [akashicRecord]
  );

  const moveToAction = useCallback(
    async (nodeId: string): Promise<void> => {
      await akashicRecord.moveTo(nodeId);
    },
    [akashicRecord]
  );

  const renameWorldLineAction = useCallback(
    async (id: string, newName: string): Promise<void> => {
      await akashicRecord.renameWorldLine(id, newName);
      setWorldLineList(akashicRecord.worldLineList);
    },
    [akashicRecord]
  );

  const registerShell = useCallback(
    (shellId: string, shellType: string) => {
      akashicRecord.registerShell(shellId, shellType);
    },
    [akashicRecord]
  );

  const unregisterShell = useCallback(
    (shellId: string) => {
      akashicRecord.unregisterShell(shellId);
    },
    [akashicRecord]
  );

  const recordAction = useCallback(
    async <T extends { id: string }>(
      shell: { id: string; dangerouslyGetDomainObject: () => T },
      shellType: string,
      description?: string
    ): Promise<void> => {
      await akashicRecord.record(shell as any, shellType, description);
    },
    [akashicRecord]
  );

  const value: AkashicRecordContextValue = {
    akashicRecord,
    activeWorldLine,
    worldLineList,
    isInitialized,
    createWorldLine,
    setActiveWorldLine: setActiveWorldLineAction,
    deleteWorldLine: deleteWorldLineAction,
    moveTo: moveToAction,
    renameWorldLine: renameWorldLineAction,
    registerShell,
    unregisterShell,
    record: recordAction,
  };

  return (
    <AkashicRecordContext.Provider value={value}>
      {children}
    </AkashicRecordContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * AkashicRecordコンテキストを使用
 */
export function useAkashicRecord(): AkashicRecordContextValue {
  const context = useContext(AkashicRecordContext);
  if (!context) {
    throw new Error(
      'useAkashicRecord must be used within AkashicRecordProvider'
    );
  }
  return context;
}

/**
 * 特定のShellを自動同期対象に登録するフック
 */
export function useShellSync(
  shellId: string | undefined,
  shellType: string,
  enabled = true
) {
  const { registerShell, unregisterShell } = useAkashicRecord();

  useEffect(() => {
    if (!shellId || !enabled) return;

    registerShell(shellId, shellType);

    return () => {
      unregisterShell(shellId);
    };
  }, [shellId, shellType, enabled, registerShell, unregisterShell]);
}

/**
 * 状態復元用のユーティリティフック
 */
export function useRestoreFromAkashicRecord() {
  const { akashicRecord, activeWorldLine } = useAkashicRecord();

  const restoreState = useCallback(
    async <T = unknown>(type: string, id: string): Promise<T | undefined> => {
      return await akashicRecord.getState<T>(type, id);
    },
    [akashicRecord]
  );

  const getCurrentSnapshots = useCallback(() => {
    return akashicRecord.getCurrentSnapshots();
  }, [akashicRecord]);

  const loadStateFromSnapshot = useCallback(
    async <T = unknown>(snapshot: { type: string; id: string; timestamp: number }): Promise<T | undefined> => {
      return await loadState<T>(snapshot);
    },
    []
  );

  return {
    restoreState,
    getCurrentSnapshots,
    loadStateFromSnapshot,
    activeWorldLine,
  };
}
