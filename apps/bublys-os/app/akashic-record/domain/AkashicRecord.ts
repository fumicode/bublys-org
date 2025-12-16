/**
 * AkashicRecord
 * bublysのオブジェクト保存基盤
 *
 * 内部にオブジェクトとその履歴、世界線を内包する。
 * ローカルにも履歴を作れるため、オフラインでも完全に動作し、
 * 将来的にはクラウドにも世界線をマージできる（fasten）。
 *
 * 設計:
 * - React非依存の純粋なクラス
 * - 可変（状態変更を許可）
 * - WorldLineとObjectStoreを統合管理
 */

import { HashWorldLine } from '../../hash-world-line/domain/HashWorldLine';
import { createStateSnapshot, StateSnapshot } from '../../hash-world-line/domain/StateSnapshot';
import {
  saveWorldLine,
  loadWorldLine,
  listWorldLines,
  deleteWorldLine as deleteWorldLineFromDB,
  saveState,
  loadState,
} from '../../hash-world-line/feature/IndexedDBStore';
import { serializeDomainObject } from '../../object-shell/domain/Serializable';
import type { DomainEntity } from '../../object-shell/domain/ObjectShell';
import type { ObjectShell } from '../../object-shell/domain/ShellProxy';

/**
 * 状態変更リスナーの型
 */
export type AkashicRecordListener = (event: AkashicRecordEvent) => void;

/**
 * AkashicRecordのイベント型
 */
export type AkashicRecordEvent =
  | { type: 'worldLineChanged'; worldLine: HashWorldLine | null }
  | { type: 'stateRecorded'; snapshot: StateSnapshot }
  | { type: 'moved'; nodeId: string };

/**
 * AkashicRecord
 * オブジェクト保存基盤のコアクラス
 */
export class AkashicRecord {
  /** 現在アクティブな世界線 */
  private _activeWorldLine: HashWorldLine | null = null;

  /** 世界線一覧のキャッシュ */
  private _worldLineList: Array<{ id: string; name: string }> = [];

  /** 読み込み済みの世界線キャッシュ */
  private _worldLineCache: Map<string, HashWorldLine> = new Map();

  /** 自動同期対象のShell（shellId → shellType） */
  private _registeredShells: Map<string, string> = new Map();

  /** リスナー */
  private _listeners: Set<AkashicRecordListener> = new Set();

  /** 初期化済みフラグ */
  private _initialized = false;

  // ============================================================================
  // Getters
  // ============================================================================

  get activeWorldLine(): HashWorldLine | null {
    return this._activeWorldLine;
  }

  get worldLineList(): ReadonlyArray<{ id: string; name: string }> {
    return this._worldLineList;
  }

  get isInitialized(): boolean {
    return this._initialized;
  }

  // ============================================================================
  // 初期化
  // ============================================================================

  /**
   * 初期化: IndexedDBから世界線一覧を読み込む
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    this._worldLineList = await listWorldLines();
    this._initialized = true;
  }

  // ============================================================================
  // 世界線管理
  // ============================================================================

  /**
   * 新しい世界線を作成
   */
  async createWorldLine(id: string, name: string): Promise<HashWorldLine> {
    const worldLine = HashWorldLine.create(id, name);
    await saveWorldLine(worldLine);

    this._worldLineCache.set(id, worldLine);
    this._worldLineList = [...this._worldLineList, { id, name }];

    return worldLine;
  }

  /**
   * 世界線を読み込む
   */
  async loadWorldLine(id: string): Promise<HashWorldLine | undefined> {
    // キャッシュを確認
    const cached = this._worldLineCache.get(id);
    if (cached) return cached;

    // IndexedDBから読み込み
    const worldLine = await loadWorldLine(id);
    if (worldLine) {
      this._worldLineCache.set(id, worldLine);
    }
    return worldLine;
  }

  /**
   * 世界線をアクティブに設定
   */
  async setActiveWorldLine(id: string): Promise<HashWorldLine | undefined> {
    let worldLine = this._worldLineCache.get(id);
    if (!worldLine) {
      worldLine = await loadWorldLine(id);
      if (worldLine) {
        this._worldLineCache.set(id, worldLine);
      }
    }

    this._activeWorldLine = worldLine ?? null;
    this._emit({ type: 'worldLineChanged', worldLine: this._activeWorldLine });

    return worldLine;
  }

  /**
   * 世界線を削除
   */
  async deleteWorldLine(id: string): Promise<void> {
    await deleteWorldLineFromDB(id);
    this._worldLineCache.delete(id);
    this._worldLineList = this._worldLineList.filter((w) => w.id !== id);

    if (this._activeWorldLine?.state.id === id) {
      this._activeWorldLine = null;
      this._emit({ type: 'worldLineChanged', worldLine: null });
    }
  }

  /**
   * 世界線の名前を変更
   */
  async renameWorldLine(id: string, newName: string): Promise<void> {
    let worldLine = this._worldLineCache.get(id);
    if (!worldLine) {
      worldLine = await loadWorldLine(id);
    }
    if (!worldLine) {
      throw new Error('World line not found');
    }

    const renamed = worldLine.rename(newName);
    await saveWorldLine(renamed);

    this._worldLineCache.set(id, renamed);
    this._worldLineList = this._worldLineList.map((w) =>
      w.id === id ? { id, name: newName } : w
    );

    if (this._activeWorldLine?.state.id === id) {
      this._activeWorldLine = renamed;
      this._emit({ type: 'worldLineChanged', worldLine: renamed });
    }
  }

  /**
   * 世界線一覧を再読み込み
   */
  async refreshWorldLineList(): Promise<void> {
    this._worldLineList = await listWorldLines();
  }

  /**
   * アクティブな世界線を直接更新（内部用）
   * ShellEventEmitterからの同期など、既に更新済みのWorldLineを設定する場合に使用
   */
  async updateActiveWorldLine(worldLine: HashWorldLine): Promise<void> {
    // IndexedDBに保存
    await saveWorldLine(worldLine);

    // キャッシュを更新
    this._worldLineCache.set(worldLine.state.id, worldLine);

    // アクティブな世界線を更新
    this._activeWorldLine = worldLine;

    this._emit({ type: 'stateRecorded', snapshot: { type: '', id: '', timestamp: 0 } });
  }

  // ============================================================================
  // 状態の記録と復元
  // ============================================================================

  /**
   * Shellの状態を記録
   */
  async record<T extends DomainEntity>(
    shell: ObjectShell<T>,
    shellType: string,
    description?: string
  ): Promise<void> {
    if (!this._activeWorldLine) {
      console.warn('[AkashicRecord] No active world line, skipping record');
      return;
    }

    const domainObject = shell.dangerouslyGetDomainObject();
    const stateData = serializeDomainObject(domainObject);

    // タイムスタンプを生成
    const timestamp = Date.now();

    // スナップショットを作成
    const snapshot = createStateSnapshot(shellType, shell.id, timestamp);

    // IndexedDBに状態を保存
    await saveState(snapshot, stateData);

    // 世界線を更新
    this._activeWorldLine = this._activeWorldLine.updateObjectState(
      snapshot,
      'system',
      description || `${shellType}:${shell.id} updated`
    );

    // IndexedDBに世界線を保存
    await saveWorldLine(this._activeWorldLine);

    // キャッシュを更新
    this._worldLineCache.set(this._activeWorldLine.state.id, this._activeWorldLine);

    this._emit({ type: 'stateRecorded', snapshot });
  }

  /**
   * 指定したオブジェクトの現在の状態を取得
   */
  async getState<T = unknown>(
    type: string,
    id: string
  ): Promise<T | undefined> {
    if (!this._activeWorldLine) {
      return undefined;
    }

    const snapshot = this._activeWorldLine.getCurrentState().getSnapshot(type, id);
    if (!snapshot) {
      return undefined;
    }

    return await loadState<T>(snapshot);
  }

  /**
   * 特定の履歴ノードに移動
   */
  async moveTo(nodeId: string): Promise<void> {
    if (!this._activeWorldLine) {
      throw new Error('No active world line');
    }

    const moved = this._activeWorldLine.moveTo(nodeId);
    if (!moved) {
      throw new Error('World history node not found');
    }

    this._activeWorldLine = moved;
    await saveWorldLine(moved);
    this._worldLineCache.set(moved.state.id, moved);

    this._emit({ type: 'moved', nodeId });
  }

  /**
   * 現在位置のスナップショット一覧を取得
   */
  getCurrentSnapshots(): Map<string, StateSnapshot> {
    if (!this._activeWorldLine) {
      return new Map();
    }

    const currentNode = this._activeWorldLine.getCurrentHistoryNode();
    if (!currentNode) {
      return new Map();
    }

    return this._activeWorldLine.getSnapshotsAt(currentNode.id);
  }

  /**
   * 指定したノードのスナップショット一覧を取得
   */
  getSnapshotsAt(nodeId: string): Map<string, StateSnapshot> {
    if (!this._activeWorldLine) {
      return new Map();
    }

    return this._activeWorldLine.getSnapshotsAt(nodeId);
  }

  // ============================================================================
  // Shell登録管理（自動同期用）
  // ============================================================================

  /**
   * 自動同期対象のShellを登録
   */
  registerShell(shellId: string, shellType: string): void {
    this._registeredShells.set(shellId, shellType);
  }

  /**
   * 自動同期対象からShellを解除
   */
  unregisterShell(shellId: string): void {
    this._registeredShells.delete(shellId);
  }

  /**
   * 登録されているShellのタイプを取得
   */
  getShellType(shellId: string): string | undefined {
    return this._registeredShells.get(shellId);
  }

  /**
   * 登録されているShell一覧を取得
   */
  getRegisteredShells(): ReadonlyMap<string, string> {
    return this._registeredShells;
  }

  // ============================================================================
  // イベント管理
  // ============================================================================

  /**
   * リスナーを登録
   */
  subscribe(listener: AkashicRecordListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * イベントを発火
   */
  private _emit(event: AkashicRecordEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[AkashicRecord] Listener error:', e);
      }
    }
  }
}

/**
 * シングルトンインスタンス
 * 将来的には複数インスタンスをサポートする可能性あり
 */
let _instance: AkashicRecord | null = null;

/**
 * AkashicRecordのシングルトンを取得
 */
export function getAkashicRecord(): AkashicRecord {
  if (!_instance) {
    _instance = new AkashicRecord();
  }
  return _instance;
}

/**
 * テスト用: インスタンスをリセット
 */
export function resetAkashicRecord(): void {
  _instance = null;
}
