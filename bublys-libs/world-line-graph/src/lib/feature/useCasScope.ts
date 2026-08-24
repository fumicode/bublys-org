import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { shallowEqual } from 'react-redux';
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
} from './worldLineGraphSlice';
import { ObjectShell } from './ObjectShell';
import { useCas } from './CasProvider';
import { loadStatesFromIDB } from './IndexedDBStore';
import { resolveStateRefs, type ResolvedObject } from './resolveStates';

// ============================================================================
// Options
// ============================================================================

export interface CasScopeOptions {
  initialObjects?: { type: string; object: unknown }[];
  /**
   * evict 済みの状態を取りに行く先。既定は IndexedDB。
   * テストから差し替えられるように注入できるようにしてある。
   */
  loadStates?: (hashes: string[]) => Promise<Map<string, unknown>>;
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
  /** 複数オブジェクトを 1回の grow でまとめて追加（シード等。type 省略時は instanceof 解決） */
  addObjects(items: { type?: string; object: unknown }[]): void;
  /** オブジェクトを削除（tombstone）して grow */
  removeObject(type: string, id: string): void;
  /**
   * 任意ノードのデシリアライズ済みオブジェクトを同期で取得（fork preview 用）。
   *
   * メモリ上の CAS しか見ないので、evict 済みのデータでは null になる。null は
   * 「削除済み」と「まだ読めていない」の両方を意味するので、確実に値が要る場面では
   * {@link resolveObjectsAt} を使うこと。表示だけなら requestNodes で先に埋めておけば、
   * 届いた時点で cas が変わり再レンダリングされて自然に解決する。
   */
  getObjectAt<T>(nodeId: string, type: string, id: string): T | null;
  /**
   * そのノード時点の全オブジェクトを解決する。メモリ上の CAS に無いものは
   * 永続ストア（IndexedDB）から取ってきてから返す。
   *
   * 「そのノードの状態を実際に取り出して使う」用途（時間移動での復元など）はこちら。
   * 同期の getObjectAt だと evict 済みのデータが黙って落ちる。
   */
  resolveObjectsAt(nodeId: string): Promise<ResolvedObject[]>;
  /**
   * これらのノードが参照するデータを、メモリ上の CAS に載せておくよう要求する。
   *
   * オンデマンド取得はふだん「今いるノード」のぶんしか走らないので、他ノードの中身を
   * 覗く表示（世界線ビューのノード要約など）はこれで先に頼んでおく。
   */
  requestNodes(nodeIds: string[]): void;
  /** undo */
  moveBack(): void;
  /** redo */
  moveForward(): void;
  /** 指定ノードに移動 */
  moveTo(nodeId: string): void;
  /** ノードに表示名（ラベル）を設定/更新する。空文字で解除。 */
  setNodeLabel(nodeId: string, label: string | undefined): void;
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

  // graphJson は Immer の構造共有により、他 scope への dispatch では参照が
  // 変わらない。selectWorldLineGraph のように毎回 fromJSON すると常に新しい
  // インスタンスになり無関係な更新でも再レンダリングされてしまうため、
  // JSON 参照が変わった時だけ WorldLineGraph を作り直す。
  const graphJson = useAppSelector(
    (state: RootState) => state.worldLineGraph?.graphs[scopeId]
  );
  const graph = useMemo(
    () => (graphJson ? WorldLineGraph.fromJSON(graphJson) : WorldLineGraph.empty()),
    [graphJson]
  );

  // このscope自身の世界線が過去に参照した hash だけに絞って cas を購読する。
  // cas はアプリ全体で共有された単一の CAS（他の universe/ShiftPlan/メモ等も
  // 同じ Record を共有）なので、絞り込まずに購読すると無関係な scope の commit
  // でもこの hook を使う全コンポーネントが再レンダリングされてしまう。
  const scopeHashes = useMemo(() => {
    const hashes: string[] = [];
    for (const node of Object.values(graph.state.nodes)) {
      for (const ref of node.changedRefs) hashes.push(ref.hash);
    }
    return hashes;
  }, [graph]);

  const cas = useAppSelector((state: RootState) => {
    const fullCas = state.worldLineGraph?.cas ?? {};
    const subset: Record<string, unknown> = {};
    for (const hash of scopeHashes) {
      if (fullCas[hash] !== undefined) subset[hash] = fullCas[hash];
    }
    return subset;
  }, shallowEqual);

  // ============================================================
  // grow / navigation — Redux dispatch
  // ============================================================

  const grow = useCallback(
    (changedRefs: StateRef[], stateEntries: { hash: string; data: unknown }[]) => {
      const updated = graph.grow(changedRefs);
      dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
      if (stateEntries.length > 0) {
        // 直後に必要になる「現在の世界」が参照するハッシュは evict 対象から保護する
        const protectHashes = updated.getCurrentStateRefs().map((ref) => ref.hash);
        dispatch(setCasEntries({ entries: stateEntries, protectHashes }));
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

  const setNodeLabel = useCallback(
    (nodeId: string, label: string | undefined) => {
      const updated = graph.setNodeLabel(nodeId, label);
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
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const loadStatesRef = useRef(options?.loadStates ?? loadStatesFromIDB);
  loadStatesRef.current = options?.loadStates ?? loadStatesFromIDB;

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

  const currentRefs = useMemo(() => graph.getCurrentStateRefs(), [graph]);

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

  const casRef = useRef(cas);
  casRef.current = cas;

  // ============================================================
  // オンデマンド取得（アカシックレコード）
  //
  // 現在の世界が参照しているはずのハッシュが Redux の cas に無い場合、
  // evict済み（＝IndexedDBにのみ存在する）とみなして裏で取得し、
  // setCasEntries で Redux に再水和する。
  // ============================================================

  /** 他ノードの中身を覗きたい側から頼まれたハッシュ（requestNodes） */
  const [requestedHashes, setRequestedHashes] = useState<readonly string[]>([]);

  const requestNodes = useCallback((nodeIds: string[]) => {
    setRequestedHashes((prev) => {
      const known = new Set(prev);
      const next = [...prev];
      for (const nodeId of nodeIds) {
        if (!graphRef.current.state.nodes[nodeId]) continue;
        for (const ref of graphRef.current.getStateRefsAt(nodeId)) {
          if (known.has(ref.hash)) continue;
          known.add(ref.hash);
          next.push(ref.hash);
        }
      }
      return next.length === prev.length ? prev : next;
    });
  }, []);

  /**
   * 一度取りに行ったハッシュ。永続ストアにも無かった（＝もう復元できない）ものを
   * レンダリングのたびに引き直さないための歯止め。
   * グラフが動いたら（編集・時間移動）諦めを解いて、もう一度だけ試す。
   */
  const attemptedRef = useRef(new Set<string>());
  useEffect(() => {
    attemptedRef.current.clear();
  }, [graph]);

  const missingHashes = useMemo(() => {
    const missing: string[] = [];
    const seen = new Set<string>();
    const want = (hash: string) => {
      if (seen.has(hash)) return;
      seen.add(hash);
      if (cas[hash] !== undefined) return;
      if (attemptedRef.current.has(hash)) return;
      missing.push(hash);
    };
    for (const ref of currentRefs) want(ref.hash);
    for (const hash of requestedHashes) want(hash);
    return missing;
  }, [currentRefs, requestedHashes, cas]);

  useEffect(() => {
    if (missingHashes.length === 0) return;
    for (const hash of missingHashes) attemptedRef.current.add(hash);
    let cancelled = false;
    loadStatesRef.current(missingHashes).then((loaded) => {
      if (cancelled || loaded.size === 0) return;
      const entries = Array.from(loaded.entries()).map(([hash, data]) => ({ hash, data }));
      dispatch(setCasEntries({ entries, protectHashes: missingHashes }));
    });
    return () => {
      cancelled = true;
    };
  }, [missingHashes, dispatch]);

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
      shell._replaceObject(obj); // 既存シェルの場合に渡したオブジェクトで更新（upsert）
      const hash = computeStateHash(shell.toJSON());
      const ref = createStateRef(type, shell.id, hash);
      growRef.current([ref], [{ hash, data: shell.toJSON() }]);
    },
    [resolveType]
  );

  // 複数オブジェクトを「1回の grow」でまとめて追加する。
  // addObject を同期ループで呼ぶと各 grow が同じ stale graph から派生して
  // 互いに上書きするため、まとめ追加（シード等）はこちらを使う。
  const addObjects = useCallback(
    (items: { type?: string; object: unknown }[]) => {
      const refs: StateRef[] = [];
      const entries: { hash: string; data: unknown }[] = [];
      for (const item of items) {
        const type =
          typeof item.type === 'string' ? item.type : resolveType(item.object);
        const config = registryRef.current[type];
        if (!config) throw new Error(`CAS type not registered: ${type}`);
        const id = config.getId(item.object);
        const shell = getOrCreateShell(type, id, item.object);
        shell._replaceObject(item.object); // 既存シェルの場合に渡したオブジェクトで更新（upsert）
        const hash = computeStateHash(shell.toJSON());
        refs.push(createStateRef(type, id, hash));
        entries.push({ hash, data: shell.toJSON() });
      }
      if (refs.length > 0) growRef.current(refs, entries);
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

  const resolveObjectsAt = useCallback(
    async (nodeId: string): Promise<ResolvedObject[]> => {
      const currentGraph = graphRef.current;
      if (!currentGraph.state.nodes[nodeId]) return [];
      const refs = currentGraph.getStateRefsAt(nodeId);

      const { resolved, loaded, unresolved } = await resolveStateRefs(
        refs,
        casRef.current,
        loadStatesRef.current,
        registryRef.current
      );

      if (loaded.size > 0) {
        dispatch(
          setCasEntries({
            entries: Array.from(loaded.entries()).map(([hash, data]) => ({
              hash,
              data,
            })),
            // このノードの状態はこれから使うので、まとめて evict から守る
            protectHashes: refs.map((ref) => ref.hash),
          })
        );
      }
      if (unresolved.length > 0) {
        // 永続ストアにも無い＝もう復元できない。黙って欠けると「古いまま」に見えるので出す。
        console.warn(
          `世界線: ノード ${nodeId} の状態を復元できませんでした: ${unresolved.join(', ')}`
        );
      }
      return resolved;
    },
    [dispatch]
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
    addObjects,
    removeObject,
    getObjectAt,
    resolveObjectsAt,
    requestNodes,
    moveBack,
    moveForward,
    moveTo,
    setNodeLabel,
    canUndo: graph.canUndo,
    canRedo: graph.canRedo,
    getForkChoices,
    graph,
    getLoadedState,
  };
}
