import { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  useAppDispatch,
  useAppSelector,
} from '@bublys-org/state-management';
import type { RootState } from '@bublys-org/state-management';
import {
  computeStateHash,
  createStateRef,
  type StateRef,
} from '../domain';
import { WorldLineGraph, type ForkChoice } from '../domain/WorldLineGraph';
import {
  setGraph,
  setCasEntries,
  selectWorldLineGraph,
} from './worldLineGraphSlice';
import { ObjectShell } from './ObjectShell';
import { useCas } from './CasProvider';

// ============================================================================
// Options
// ============================================================================

export interface CasScopeOptions {
  initialObjects?: { type: string; object: unknown }[];
}

// ============================================================================
// Return type
// ============================================================================

export interface CasScopeValue {
  /** 指定した型の全シェルを取得 */
  shells<T>(type: string): ObjectShell<T>[];
  /** 指定した型・IDのシェルを取得 */
  getShell<T>(type: string, id: string): ObjectShell<T> | null;
  /** オブジェクトを追加して grow（型文字列省略時は instanceof で自動解決） */
  addObject(type: string, obj: unknown): void;
  addObject(obj: unknown): void;
  /** オブジェクトを削除（tombstone）して grow */
  removeObject(type: string, id: string): void;
  /** 任意ノードのデシリアライズ済みオブジェクトを取得（fork preview 用） */
  getObjectAt<T>(nodeId: string, type: string, id: string): T | null;
  /** undo */
  moveBack(): void;
  /** redo */
  moveForward(): void;
  /** 指定ノードに移動 */
  moveTo(nodeId: string): void;
  /** undo 可能かどうか */
  canUndo: boolean;
  /** redo 可能かどうか */
  canRedo: boolean;
  /** fork 選択肢を取得 */
  getForkChoices(): ForkChoice[];
  /** 低レベルアクセス: 基盤の WorldLineGraph（DAG 可視化など高度な用途向け） */
  graph: WorldLineGraph;
  /** 低レベルアクセス: ハッシュからシリアライズ済みデータを取得 */
  getLoadedState<T>(hash: string): T | undefined;
}

// ============================================================================
// useCasScope — WorldLineGraphProvider + useShellManager を統合する hook
//
// Provider ネスト不要。直接 Redux セレクタでスコープデータにアクセス。
// CasProvider の registry で型安全なデシリアライズを行う。
// ============================================================================

export function useCasScope(
  scopeId: string,
  options?: CasScopeOptions
): CasScopeValue {
  const dispatch = useAppDispatch();
  const { registry } = useCas();

  const graph = useAppSelector((state) => selectWorldLineGraph(state, scopeId));
  const cas = useAppSelector(
    (state: RootState) => state.worldLineGraph?.cas ?? {}
  );

  // ============================================================
  // grow / navigation — Redux dispatch
  // ============================================================

  const grow = useCallback(
    (changedRefs: StateRef[], stateEntries: { hash: string; data: unknown }[]) => {
      const updated = graph.grow(changedRefs);
      dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
      if (stateEntries.length > 0) {
        dispatch(setCasEntries({ entries: stateEntries }));
      }
    },
    [dispatch, scopeId, graph]
  );

  const moveBack = useCallback(() => {
    const updated = graph.moveBack();
    dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  }, [dispatch, scopeId, graph]);

  const moveForward = useCallback(() => {
    const updated = graph.moveForward();
    dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  }, [dispatch, scopeId, graph]);

  const moveTo = useCallback(
    (nodeId: string) => {
      const updated = graph.moveTo(nodeId);
      dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
    },
    [dispatch, scopeId, graph]
  );

  // ============================================================
  // Ref で最新の grow と registry を保持（stale closure 回避）
  // ============================================================

  const growRef = useRef(grow);
  growRef.current = grow;
  const registryRef = useRef(registry);
  registryRef.current = registry;

  // ============================================================
  // Shell 管理 — Map<"type:id", ObjectShell>
  // ============================================================

  const shellMapRef = useRef(new Map<string, ObjectShell<unknown>>());

  function getOrCreateShell(type: string, id: string, obj: unknown): ObjectShell<unknown> {
    const key = `${type}:${id}`;
    let shell = shellMapRef.current.get(key);
    if (!shell) {
      const config = registryRef.current[type];
      if (!config) throw new Error(`CAS type not registered: ${type}`);
      shell = new ObjectShell(id, obj, config.toJSON);
      const s = shell;
      s._bind(() => {
        const hash = computeStateHash(s.toJSON());
        const ref = createStateRef(type, s.id, hash);
        growRef.current([ref], [{ hash, data: s.toJSON() }]);
      });
      shellMapRef.current.set(key, shell);
    }
    return shell;
  }

  // ============================================================
  // StateRef から alive shells を導出 + apex 変更時の自動 sync
  // ============================================================

  const currentRefs = graph.getCurrentStateRefs();

  // 型ごとにグループ化
  const shellsByType = useMemo(() => {
    const map = new Map<string, ObjectShell<unknown>[]>();
    for (const ref of currentRefs) {
      const data = cas[ref.hash];
      if (data === undefined || data === null) continue;
      const config = registry[ref.type];
      if (!config) continue;
      const obj = config.fromJSON(data);
      const shell = getOrCreateShell(ref.type, ref.id, obj);
      shell._replaceObject(obj);
      const list = map.get(ref.type) ?? [];
      list.push(shell);
      map.set(ref.type, list);
    }
    return map;
  }, [currentRefs, cas, registry]);

  // ============================================================
  // 初回: root ノードを initialObjects で作成
  // ============================================================

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (graph.state.rootNodeId !== null) return;
    const initials = options?.initialObjects;
    if (!initials?.length) return;
    initializedRef.current = true;

    const refs: StateRef[] = [];
    const entries: { hash: string; data: unknown }[] = [];
    for (const { type, object } of initials) {
      const config = registryRef.current[type];
      if (!config) continue;
      const id = config.getId(object);
      const shell = getOrCreateShell(type, id, object);
      const hash = computeStateHash(shell.toJSON());
      refs.push(createStateRef(type, id, hash));
      entries.push({ hash, data: shell.toJSON() });
    }
    growRef.current(refs, entries);
  }, [graph.state.rootNodeId]);

  // ============================================================
  // 公開 API
  // ============================================================

  const shells = useCallback(
    <T,>(type: string): ObjectShell<T>[] => {
      return (shellsByType.get(type) ?? []) as ObjectShell<T>[];
    },
    [shellsByType]
  );

  const getShell = useCallback(
    <T,>(type: string, id: string): ObjectShell<T> | null => {
      const typeShells = shellsByType.get(type);
      if (!typeShells) return null;
      return (typeShells.find((s) => s.id === id) as ObjectShell<T>) ?? null;
    },
    [shellsByType]
  );

  const resolveType = useCallback(
    (obj: unknown): string => {
      for (const [type, config] of Object.entries(registryRef.current)) {
        if (config.class && obj instanceof config.class) return type;
      }
      throw new Error('Unknown domain object type: no class matched via instanceof');
    },
    []
  );

  const addObject = useCallback(
    (objOrType: string | unknown, maybeObj?: unknown) => {
      let type: string;
      let obj: unknown;
      if (typeof objOrType === 'string') {
        type = objOrType;
        obj = maybeObj;
      } else {
        type = resolveType(objOrType);
        obj = objOrType;
      }
      const config = registryRef.current[type];
      if (!config) throw new Error(`CAS type not registered: ${type}`);
      const id = config.getId(obj);
      const shell = getOrCreateShell(type, id, obj);
      const hash = computeStateHash(shell.toJSON());
      const ref = createStateRef(type, shell.id, hash);
      growRef.current([ref], [{ hash, data: shell.toJSON() }]);
    },
    [resolveType]
  );

  const removeObject = useCallback(
    (type: string, id: string) => {
      const hash = computeStateHash(null);
      const ref = createStateRef(type, id, hash);
      growRef.current([ref], [{ hash, data: null }]);
    },
    []
  );

  const getObjectAt = useCallback(
    <T,>(nodeId: string, type: string, id: string): T | null => {
      const refs = graph.getStateRefsAt(nodeId);
      const ref = refs.find((r) => r.type === type && r.id === id);
      if (!ref) return null;
      const data = cas[ref.hash];
      if (data === undefined || data === null) return null;
      const config = registry[type];
      if (!config) return null;
      return config.fromJSON(data) as T;
    },
    [graph, cas, registry]
  );

  const getForkChoices = useCallback(
    () => graph.getForkChoices(),
    [graph]
  );

  const getLoadedState = useCallback(
    <T,>(hash: string): T | undefined => {
      return cas[hash] as T | undefined;
    },
    [cas]
  );

  return {
    shells,
    getShell,
    addObject,
    removeObject,
    getObjectAt,
    moveBack,
    moveForward,
    moveTo,
    canUndo: graph.canUndo,
    canRedo: graph.canRedo,
    getForkChoices,
    graph,
    getLoadedState,
  };
}
