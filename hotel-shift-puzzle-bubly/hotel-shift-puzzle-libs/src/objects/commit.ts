'use client';

/**
 * 世界線への書き込み層（imperative）
 *
 * オブジェクトを「監視している世界線スコープすべて」へ保存する。
 *   - アプリ全体スコープ（APP_SCOPE_ID）… 常に監視
 *   - ローカルスコープ（type:id）… 記述子に localHistory:true があれば監視
 *
 * store.getState() を都度読むので、同期で複数 grow しても stale なグラフで上書きし合わない。
 * feature 側はこれを直接使わず、シェル（useObjectShell）/ useObjectRepo 経由で触る。
 */
import {
  WorldLineGraph,
  computeStateHash,
  createStateRef,
  setGraph,
  setCasEntries,
} from "@bublys-org/world-line-graph";
import { getDescriptor, type ObjectDescriptor } from "./framework.js";

/** アプリ全体の世界線スコープID */
export const APP_SCOPE_ID = "hotel";

/** 型ごとのローカル世界線スコープID */
export const localScopeId = (type: string, id: string): string => `${type}:${id}`;

type StoreLike = {
  getState: () => {
    worldLineGraph?: {
      graphs?: Record<string, unknown>;
      cas?: Record<string, unknown>;
    };
  };
  dispatch: (action: unknown) => void;
};

function codecOf(d: ObjectDescriptor) {
  return {
    toJSON: (o: unknown) =>
      d.serialize ? d.serialize.toJSON(o) : (o as { state: unknown }).state,
    fromJSON: (j: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      d.serialize ? d.serialize.fromJSON(j) : new (d.class as any)(j),
  };
}

function graphOf(store: StoreLike, scopeId: string): WorldLineGraph {
  const json = store.getState().worldLineGraph?.graphs?.[scopeId];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json ? WorldLineGraph.fromJSON(json as any) : WorldLineGraph.empty();
}

export function isScopeEmpty(store: StoreLike, scopeId: string): boolean {
  return graphOf(store, scopeId).state.rootNodeId === null;
}

/** 1オブジェクトを1スコープへ記録（grow）する */
export function commitToScope(
  store: StoreLike,
  scopeId: string,
  type: string,
  obj: unknown
): void {
  const d = getDescriptor(type);
  if (!d) throw new Error(`commit: type "${type}" が未登録です`);
  const codec = codecOf(d);
  const id = d.getId(obj);
  const data = codec.toJSON(obj);
  const hash = computeStateHash(data);
  const ref = createStateRef(type, id, hash);
  const updated = graphOf(store, scopeId).grow([ref]);
  store.dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  store.dispatch(setCasEntries({ entries: [{ hash, data }] }));
}

/** スコープの apex から型・IDのオブジェクトを読む */
export function readFromScope<T>(
  store: StoreLike,
  scopeId: string,
  type: string,
  id: string
): T | undefined {
  const d = getDescriptor(type);
  if (!d) return undefined;
  const graph = graphOf(store, scopeId);
  const apex = graph.state.apexNodeId;
  if (!apex) return undefined;
  const ref = graph.getStateRefsAt(apex).find((r) => r.type === type && r.id === id);
  if (!ref) return undefined;
  const data = store.getState().worldLineGraph?.cas?.[ref.hash];
  if (data === undefined || data === null) return undefined;
  return codecOf(d).fromJSON(data) as T;
}

/**
 * オブジェクトを「監視している世界線すべて」へ保存する。
 * localHistory の型は、初回はローカル世界線の起点を「編集前の状態」で作ってから記録する。
 */
export function saveObject(store: StoreLike, type: string, obj: unknown): void {
  const d = getDescriptor(type);
  if (!d) throw new Error(`save: type "${type}" が未登録です`);
  const id = d.getId(obj);

  if (d.localHistory) {
    const localId = localScopeId(type, id);
    if (isScopeEmpty(store, localId)) {
      const prev = readFromScope(store, APP_SCOPE_ID, type, id);
      if (prev !== undefined) commitToScope(store, localId, type, prev); // 起点=編集前
    }
    commitToScope(store, localId, type, obj);
  }

  commitToScope(store, APP_SCOPE_ID, type, obj);
}

/** アプリ全体スコープからオブジェクトを削除（tombstone） */
export function removeObject(store: StoreLike, type: string, id: string): void {
  const hash = computeStateHash(null);
  const ref = createStateRef(type, id, hash);
  const updated = graphOf(store, APP_SCOPE_ID).grow([ref]);
  store.dispatch(setGraph({ scopeId: APP_SCOPE_ID, graph: updated.toJSON() }));
  store.dispatch(setCasEntries({ entries: [{ hash, data: null }] }));
}
