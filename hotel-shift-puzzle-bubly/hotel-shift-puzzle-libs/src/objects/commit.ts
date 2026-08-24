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

export type BundleItem = { type: string; obj: unknown };

/** 1オブジェクトを1スコープへ記録（grow）する */
export function commitToScope(
  store: StoreLike,
  scopeId: string,
  type: string,
  obj: unknown
): void {
  commitBundle(store, scopeId, [{ type, obj }]);
}

/**
 * 複数オブジェクトを同一ノードの grow で記録する。
 * Schedule + ScheduleEditLog のように「操作と結果状態」を同じ世界線ノードに載せるときに使う。
 * saveObject を連続呼びするとノードが分かれるため、編集記録時はこちらを使う。
 */
export function commitBundle(
  store: StoreLike,
  scopeId: string,
  items: BundleItem[]
): void {
  if (items.length === 0) return;
  const refs = [];
  const casEntries: { hash: string; data: unknown }[] = [];
  for (const { type, obj } of items) {
    const d = getDescriptor(type);
    if (!d) throw new Error(`commit: type "${type}" が未登録です`);
    const codec = codecOf(d);
    const id = d.getId(obj);
    const data = codec.toJSON(obj);
    const hash = computeStateHash(data);
    refs.push(createStateRef(type, id, hash));
    casEntries.push({ hash, data });
  }
  const updated = graphOf(store, scopeId).grow(refs);
  store.dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  store.dispatch(setCasEntries({ entries: casEntries }));
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
    ensureLocalBaseline(store, localId, type, obj);
    commitToScope(store, localId, type, obj);
  }

  commitToScope(store, APP_SCOPE_ID, type, obj);
}

/**
 * 複数オブジェクトをローカル世界線の同一ノードに載せ、それぞれ APP スコープにも反映する。
 * Schedule + ScheduleEditLog（＋必要なら Constraints）を1操作で記録するときに使う。
 * ローカルは1 grow、APP はオブジェクトごとに1 grow（平坦な変更ログ）。
 */
export function saveLocalBundle(
  store: StoreLike,
  localScopeIdValue: string,
  items: BundleItem[]
): void {
  for (const { type, obj } of items) {
    ensureLocalBaseline(store, localScopeIdValue, type, obj);
  }
  commitBundle(store, localScopeIdValue, items);
  for (const { type, obj } of items) {
    commitToScope(store, APP_SCOPE_ID, type, obj);
  }
}

/** ローカルスコープに初登場なら、APP の現在値を起点として先に記録する */
function ensureLocalBaseline(
  store: StoreLike,
  localId: string,
  type: string,
  obj: unknown
): void {
  const d = getDescriptor(type);
  if (!d) throw new Error(`save: type "${type}" が未登録です`);
  const id = d.getId(obj);
  const alreadyInScope = readFromScope(store, localId, type, id) !== undefined;
  if (alreadyInScope) return;
  const prev = readFromScope(store, APP_SCOPE_ID, type, id);
  if (prev !== undefined) commitToScope(store, localId, type, prev);
}

/**
 * グローバル（APP_SCOPE）の型オブジェクトを、新しい origin（勤務表など）のスコープへ取り込む。
 *
 * 「グローバルにもテンプレートがあり、新しい世界線オリジンが作られるときにグローバルのものを
 *  スコープ内へコピーして独自版にする」という、よくあるパターンの標準 API。
 * 使い方: 取り込む型に localScope（origin スコープへ束ねる規約）を付けておき、origin 作成時に
 *   adoptGlobalObject(store, WORKSHIFT_SET_TYPE, set => set.withId(scheduleId), GLOBAL_ID)
 * を呼ぶ。transform でグローバル値の id を origin 用へ差し替えると、saveObject が記述子の
 * localScope を見て origin スコープ＋APP_SCOPE の両方へ記録する（以後 origin の世界線に載る）。
 *
 * グローバル値が未投入なら undefined を返す（呼び出し側で既定生成へフォールバック可能）。
 */
export function adoptGlobalObject<T>(
  store: StoreLike,
  type: string,
  transform: (global: T) => T,
  globalId: string
): T | undefined {
  const global = readFromScope<T>(store, APP_SCOPE_ID, type, globalId);
  if (global === undefined) return undefined;
  const adopted = transform(global);
  saveObject(store, type, adopted);
  return adopted;
}

/**
 * 同じ親から複数の「案」を兄弟ブランチとして記録する（世界線で見比べる用）。
 * - 書き込み先はローカル世界線スコープのみ（アプリ全体は現状のまま）。
 * - スコープが空なら baseObj を root として置き、それを共通の親にする。空でなければ現在の apex を親とする。
 * - 各案は共通の親から grow する：apex に子ができると grow が自動でブランチを作る仕様なので、
 *   2案目以降は親へ moveTo してから grow すると兄弟になる。各ノードに label を付ける。
 * - extras があればその案の Schedule と同一ノードに載せる（例: ScheduleEditLog）。
 * - 書き込み後は先頭の案（案1）に着地させる：ローカル apex を案1へ移し、その状態をアプリ全体
 *   スコープへも反映する（世界線ビューの apex と、実際に表示される状態を案1で一致させる）。
 * 返り値: 親ノードIDと、書き込んだ各案のノードID。
 */
export function commitCandidates(
  store: StoreLike,
  scopeId: string,
  type: string,
  baseObj: unknown,
  candidates: { obj: unknown; label?: string; extras?: BundleItem[] }[]
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
    const items: BundleItem[] = [{ type, obj: c.obj }, ...(c.extras ?? [])];
    commitBundle(store, scopeId, items);
    const g = graphOf(store, scopeId);
    const apex = g.state.apexNodeId as string;
    nodeIds.push(apex);
    if (c.label) {
      store.dispatch(setGraph({ scopeId, graph: g.setNodeLabel(apex, c.label).toJSON() }));
    }
  });

  // 案1に着地：ローカル apex を案1へ移し、そのノードの全オブジェクトをアプリ全体へ反映する
  const landing = nodeIds[0];
  if (landing) {
    store.dispatch(setGraph({ scopeId, graph: graphOf(store, scopeId).moveTo(landing).toJSON() }));
    const g = graphOf(store, scopeId);
    for (const ref of g.getStateRefsAt(landing)) {
      const d = getDescriptor(ref.type);
      if (!d) continue;
      const data = store.getState().worldLineGraph?.cas?.[ref.hash];
      if (data === undefined || data === null) continue;
      commitToScope(store, APP_SCOPE_ID, ref.type, codecOf(d).fromJSON(data));
    }
  }

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
