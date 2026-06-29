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
 * 記述子の localScope が示すローカル世界線にも記録する（複数オブジェクトが同じスコープに
 * 相乗りする＝case B）。各オブジェクトがそのスコープに初登場するときは、編集前の状態を
 * 起点として先に記録する（まとめて巻き戻したとき元に戻れる）。
 */
export function saveObject(store: StoreLike, type: string, obj: unknown): void {
  const d = getDescriptor(type);
  if (!d) throw new Error(`save: type "${type}" が未登録です`);

  const localId = d.localScope?.(obj);
  if (localId) {
    const id = d.getId(obj);
    const alreadyInScope = readFromScope(store, localId, type, id) !== undefined;
    if (!alreadyInScope) {
      const prev = readFromScope(store, APP_SCOPE_ID, type, id);
      if (prev !== undefined) commitToScope(store, localId, type, prev); // この型の起点
    }
    commitToScope(store, localId, type, obj);
  }

  commitToScope(store, APP_SCOPE_ID, type, obj);
}

/**
 * 同じ親から複数の「案」を兄弟ブランチとして記録する（世界線で見比べる用）。
 * - 書き込み先はローカル世界線スコープのみ（アプリ全体は現状のまま）。
 * - スコープが空なら baseObj を root として置き、それを共通の親にする。空でなければ現在の apex を親とする。
 * - 各案は共通の親から grow する：apex に子ができると grow が自動でブランチを作る仕様なので、
 *   2案目以降は親へ moveTo してから grow すると兄弟になる。各ノードに label を付ける。
 * 返り値: 親ノードIDと、書き込んだ各案のノードID。
 */
export function commitCandidates(
  store: StoreLike,
  scopeId: string,
  type: string,
  baseObj: unknown,
  candidates: { obj: unknown; label?: string }[]
): { parentNodeId: string; nodeIds: string[] } {
  if (isScopeEmpty(store, scopeId)) {
    commitToScope(store, scopeId, type, baseObj); // root = 現状（共通の親）
  }
  const parentNodeId = graphOf(store, scopeId).state.apexNodeId as string;
  const nodeIds: string[] = [];

  candidates.forEach((c, i) => {
    if (i > 0) {
      // 親へ戻してから grow → 兄弟ブランチになる
      const moved = graphOf(store, scopeId).moveTo(parentNodeId);
      store.dispatch(setGraph({ scopeId, graph: moved.toJSON() }));
    }
    commitToScope(store, scopeId, type, c.obj);
    const g = graphOf(store, scopeId);
    const apex = g.state.apexNodeId as string;
    nodeIds.push(apex);
    if (c.label) {
      store.dispatch(setGraph({ scopeId, graph: g.setNodeLabel(apex, c.label).toJSON() }));
    }
  });

  return { parentNodeId, nodeIds };
}

/** アプリ全体スコープからオブジェクトを削除（tombstone） */
export function removeObject(store: StoreLike, type: string, id: string): void {
  const hash = computeStateHash(null);
  const ref = createStateRef(type, id, hash);
  const updated = graphOf(store, APP_SCOPE_ID).grow([ref]);
  store.dispatch(setGraph({ scopeId: APP_SCOPE_ID, graph: updated.toJSON() }));
  store.dispatch(setCasEntries({ entries: [{ hash, data: null }] }));
}
