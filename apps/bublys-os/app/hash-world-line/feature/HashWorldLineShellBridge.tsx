'use client';

/**
 * HashWorldLineShellBridge
 * ShellManager と HashWorldLine の橋渡しを行うコンポーネント
 *
 * 機能:
 * - Shell の状態変更を監視して HashWorldLine に同期
 * - HashWorldLine から Shell の状態を復元
 *
 * 設計:
 * - 非侵襲的: 既存の ShellManager / ShellProxy は変更しない
 * - オプトイン: このコンポーネントをマウントした場合のみ有効
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useHashWorldLine } from './HashWorldLineManager';
import { useShellManager } from '../../object-shell/feature/ShellManager';
import { computeObjectHash } from '../domain/hashUtils';
import type { DomainEntity } from '../../object-shell/domain/ObjectShell';
import type { ObjectShell } from '../../object-shell/domain/ShellProxy';

// ============================================================================
// Context の定義
// ============================================================================

interface ShellBridgeContextValue {
  /** Shell の状態を世界線に同期 */
  syncShellToWorldLine: <T extends DomainEntity>(
    shell: ObjectShell<T>,
    shellType: string,
    description?: string
  ) => Promise<void>;

  /** 世界線から Shell の状態を復元 */
  restoreShellFromWorldLine: <T extends DomainEntity>(
    shellType: string,
    shellId: string
  ) => Promise<unknown | undefined>;

  /** 自動同期を有効にする Shell を登録 */
  registerForAutoSync: (shellId: string, shellType: string) => void;

  /** 自動同期の登録を解除 */
  unregisterFromAutoSync: (shellId: string) => void;

  /** 登録されている Shell 一覧を取得 */
  getRegisteredShells: () => Map<string, string>;
}

const ShellBridgeContext = createContext<ShellBridgeContextValue | null>(null);

// ============================================================================
// Provider コンポーネント
// ============================================================================

interface HashWorldLineShellBridgeProviderProps {
  children: ReactNode;
  /** 自動同期の間隔（ミリ秒）。0の場合は手動同期のみ */
  autoSyncInterval?: number;
}

export function HashWorldLineShellBridgeProvider({
  children,
  autoSyncInterval = 0,
}: HashWorldLineShellBridgeProviderProps) {
  const hashWorldLine = useHashWorldLine();
  const shellManager = useShellManager();

  // 自動同期対象の Shell（shellId → shellType）
  const registeredShellsRef = useRef<Map<string, string>>(new Map());

  // 前回のハッシュ値を記録（変更検出用）
  const previousHashesRef = useRef<Map<string, string>>(new Map());

  /**
   * Shell の状態を世界線に同期
   */
  const syncShellToWorldLine = useCallback(
    async <T extends DomainEntity>(
      shell: ObjectShell<T>,
      shellType: string,
      description?: string
    ) => {
      if (!hashWorldLine.activeWorldLine) {
        console.warn('No active world line, skipping sync');
        return;
      }

      const domainObject = shell.dangerouslyGetDomainObject();
      const stateData = 'toJson' in domainObject && typeof (domainObject as any).toJson === 'function'
        ? (domainObject as any).toJson()
        : domainObject;

      // 前回と同じハッシュならスキップ
      const newHash = await computeObjectHash(stateData);
      const prevHash = previousHashesRef.current.get(shell.id);
      if (newHash === prevHash) {
        return;
      }

      // 世界線に状態を保存
      await hashWorldLine.updateObjectState(
        shellType,
        shell.id,
        stateData,
        'system',
        description || `${shellType}:${shell.id} updated`
      );

      // ハッシュを更新
      previousHashesRef.current.set(shell.id, newHash);
    },
    [hashWorldLine]
  );

  /**
   * 世界線から Shell の状態を復元
   */
  const restoreShellFromWorldLine = useCallback(
    async <T extends DomainEntity>(
      shellType: string,
      shellId: string
    ): Promise<unknown | undefined> => {
      return await hashWorldLine.getObjectState(shellType, shellId);
    },
    [hashWorldLine]
  );

  /**
   * 自動同期を有効にする Shell を登録
   */
  const registerForAutoSync = useCallback(
    (shellId: string, shellType: string) => {
      registeredShellsRef.current.set(shellId, shellType);
    },
    []
  );

  /**
   * 自動同期の登録を解除
   */
  const unregisterFromAutoSync = useCallback((shellId: string) => {
    registeredShellsRef.current.delete(shellId);
    previousHashesRef.current.delete(shellId);
  }, []);

  /**
   * 登録されている Shell 一覧を取得
   */
  const getRegisteredShells = useCallback(() => {
    return new Map(registeredShellsRef.current);
  }, []);

  /**
   * 自動同期の実行
   */
  const runAutoSync = useCallback(async () => {
    if (!hashWorldLine.activeWorldLine) return;

    const registeredShells = registeredShellsRef.current;
    for (const [shellId, shellType] of registeredShells) {
      const shell = shellManager.getShell(shellId);
      if (shell) {
        await syncShellToWorldLine(shell, shellType);
      }
    }
  }, [hashWorldLine.activeWorldLine, shellManager, syncShellToWorldLine]);

  /**
   * 自動同期のインターバル設定
   */
  useEffect(() => {
    if (autoSyncInterval <= 0) return;

    const intervalId = setInterval(() => {
      runAutoSync();
    }, autoSyncInterval);

    return () => clearInterval(intervalId);
  }, [autoSyncInterval, runAutoSync]);

  const value: ShellBridgeContextValue = {
    syncShellToWorldLine,
    restoreShellFromWorldLine,
    registerForAutoSync,
    unregisterFromAutoSync,
    getRegisteredShells,
  };

  return (
    <ShellBridgeContext.Provider value={value}>
      {children}
    </ShellBridgeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useHashWorldLineShellBridge(): ShellBridgeContextValue {
  const context = useContext(ShellBridgeContext);
  if (!context) {
    throw new Error(
      'useHashWorldLineShellBridge must be used within HashWorldLineShellBridgeProvider'
    );
  }
  return context;
}

/**
 * 特定の Shell を世界線に自動同期するフック
 *
 * @param shellId - 同期する Shell の ID
 * @param shellType - Shell のタイプ（例: 'counter'）
 * @param enabled - 同期を有効にするかどうか
 */
export function useShellWorldLineSync(
  shellId: string | undefined,
  shellType: string,
  enabled = true
) {
  const bridge = useHashWorldLineShellBridge();
  const shellManager = useShellManager();

  // 登録/解除
  useEffect(() => {
    if (!shellId || !enabled) return;

    bridge.registerForAutoSync(shellId, shellType);

    return () => {
      bridge.unregisterFromAutoSync(shellId);
    };
  }, [shellId, shellType, enabled, bridge]);

  // 手動同期関数
  const syncNow = useCallback(
    async (description?: string) => {
      if (!shellId) return;

      const shell = shellManager.getShell(shellId);
      if (shell) {
        await bridge.syncShellToWorldLine(shell, shellType, description);
      }
    },
    [shellId, shellType, shellManager, bridge]
  );

  return { syncNow };
}
