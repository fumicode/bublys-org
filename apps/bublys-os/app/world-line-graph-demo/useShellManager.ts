import { useRef, useEffect, useCallback } from 'react';
import {
  useWorldLineGraph,
  computeStateHash,
  createStateRef,
  type StateRef,
} from '@bublys-org/world-line-graph';
import { ObjectShell } from './ObjectShell';

// ============================================================================
// Config
// ============================================================================

export interface ShellManagerConfig<T> {
  fromJSON: (json: unknown) => T;
  toJSON: (obj: T) => unknown;
  getId: (obj: T) => string;
  initialObjects?: T[];
}

// ============================================================================
// useShellManager — ObjectShell と WorldLineGraph を接続する hook
//
// 責務:
//   - Shell の生成・キャッシュ（Map 管理）
//   - commit 関数の bind（growRef で stale closure 回避）
//   - StateRef の有無から「生きている」Shell を導出
//   - apex 変更時の自動 sync（_replaceObject）
//   - 初回 root ノードの作成
// ============================================================================

export function useShellManager<T>(
  type: string,
  config: ShellManagerConfig<T>
) {
  const { grow, graph, getLoadedState } = useWorldLineGraph();

  // Ref で最新の grow と config を保持（stale closure 回避）
  const growRef = useRef(grow);
  growRef.current = grow;
  const configRef = useRef(config);
  configRef.current = config;

  const shellMapRef = useRef(new Map<string, ObjectShell<T>>());

  // Shell を取得。なければ作成して commitFn を bind
  function getOrCreateShell(id: string, obj: T): ObjectShell<T> {
    let shell = shellMapRef.current.get(id);
    if (!shell) {
      shell = new ObjectShell(id, obj, configRef.current.toJSON);
      const s = shell; // closure 用に固定
      s._bind(() => {
        const hash = computeStateHash(s.toJSON());
        const ref = createStateRef(type, s.id, hash);
        growRef.current([ref], [{ hash, data: s.toJSON() }]);
      });
      shellMapRef.current.set(id, shell);
    }
    return shell;
  }

  // ============================================================
  // StateRef から alive shells を導出 + apex 変更時の自動 sync
  // ============================================================

  const currentRefs = graph.getCurrentStateRefs();
  const aliveRefs = currentRefs.filter((r) => r.type === type);

  const shells: ObjectShell<T>[] = [];
  for (const ref of aliveRefs) {
    const data = getLoadedState(ref.hash);
    if (data === undefined || data === null) continue; // null = tombstone（削除済み）
    const obj = configRef.current.fromJSON(data);
    const shell = getOrCreateShell(ref.id, obj);
    // apex 変更時はここで内部オブジェクトが sync される
    shell._replaceObject(obj);
    shells.push(shell);
  }

  // ============================================================
  // 初回: root ノードを initialObjects で作成
  // ============================================================

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (graph.state.rootNodeId !== null) return;
    const initials = configRef.current.initialObjects;
    if (!initials?.length) return;
    initializedRef.current = true;

    const refs: StateRef[] = [];
    const entries: { hash: string; data: unknown }[] = [];
    for (const obj of initials) {
      const cfg = configRef.current;
      const id = cfg.getId(obj);
      const shell = getOrCreateShell(id, obj);
      const hash = computeStateHash(shell.toJSON());
      refs.push(createStateRef(type, id, hash));
      entries.push({ hash, data: shell.toJSON() });
    }
    growRef.current(refs, entries);
  }, [graph.state.rootNodeId, type]);

  // ============================================================
  // addShell — 新しいオブジェクトを追加して grow
  // ============================================================

  const addShell = useCallback(
    (obj: T) => {
      const cfg = configRef.current;
      const id = cfg.getId(obj);
      const shell = getOrCreateShell(id, obj);
      const hash = computeStateHash(shell.toJSON());
      const ref = createStateRef(type, shell.id, hash);
      growRef.current([ref], [{ hash, data: shell.toJSON() }]);
    },
    [type]
  );

  // ============================================================
  // removeShell — null を tombstone として grow（削除）
  // ============================================================

  const removeShell = useCallback(
    (id: string) => {
      const hash = computeStateHash(null);
      const ref = createStateRef(type, id, hash);
      growRef.current([ref], [{ hash, data: null }]);
    },
    [type]
  );

  return { shells, addShell, removeShell };
}
