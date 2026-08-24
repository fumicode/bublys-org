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
  type StateRef,
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

/**
 * スコープの apex にある、その型・IDの参照（StateRef）を返す。
 *
 * 「そのスコープにそのオブジェクトが載っているか」は**参照の有無**で決まる。
 * 実データはメモリ上の CAS から追い出されていることがあるので、
 * 値が読めるかどうかで判断してはいけない（世界線の記録が欠ける）。
 */
export function refInScope(
  store: StoreLike,
  scopeId: string,
  type: string,
  id: string
): StateRef | undefined {
  const graph = graphOf(store, scopeId);
  const apex = graph.state.apexNodeId;
  if (!apex) return undefined;
  return graph.getStateRefsAt(apex).find((r) => r.type === type && r.id === id);
}

/**
 * その型・IDが、このスコープの履歴の**どこか**に載っているか。
 *
 * 「初登場か」の判定に apex を使ってはいけない。時間移動で過去のノードへ戻ると、
 * まだその型が登場していない時点が apex になり、編集のたびに起点ノードが差し込まれる
 * （分岐するたびに余計なノードが1つ増える）。登場したことがあるかは履歴全体で決まる。
 */
function everInScope(
  store: StoreLike,
  scopeId: string,
  type: string,
  id: string
): boolean {
  const nodes = graphOf(store, scopeId).state.nodes;
  return Object.values(nodes).some((node) =>
    node.changedRefs.some((r) => r.type === type && r.id === id)
  );
}

/**
 * 既存の参照をそのままスコープへ記録する（grow）。
 *
 * 参照が指す実データは既に CAS／永続ストアにあるので、値を読み直す必要はない。
 * 「他のスコープにある現在値を、こちらのスコープの起点として置く」用途。
 */
function growWithRefs(store: StoreLike, scopeId: string, refs: StateRef[]): void {
  if (refs.length === 0) return;
  const updated = graphOf(store, scopeId).grow(refs);
  store.dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
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
  if (!ref) return undefined; // そのオブジェクトはこのスコープに無い
  const data = store.getState().worldLineGraph?.cas?.[ref.hash];
  if (data === null) return undefined; // 削除済み（tombstone）
  if (data === undefined) {
    // 参照はあるのに実データがメモリに無い＝CAS から追い出されただけ。
    // ここで undefined を返すと「オブジェクトが無い」と区別がつかず、呼び出し側が
    // 記録を飛ばして世界線が欠ける。同期では取りに行けないので、せめて黙らない。
    console.warn(
      `世界線: ${scopeId} の ${type}:${id} は参照だけあって実データが手元にありません` +
        `（メモリ上の CAS から追い出された可能性）。値を必要としない経路を使ってください。`
    );
    return undefined;
  }
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

/** 値から参照を作り、実データを CAS へ載せる（記録はまだしない） */
function refForItem(store: StoreLike, { type, obj }: BundleItem): StateRef {
  const d = getDescriptor(type);
  if (!d) throw new Error(`save: type "${type}" が未登録です`);
  const data = codecOf(d).toJSON(obj);
  const hash = computeStateHash(data);
  store.dispatch(setCasEntries({ entries: [{ hash, data }] }));
  return createStateRef(type, d.getId(obj), hash);
}

/**
 * 複数オブジェクトをローカル世界線の同一ノードに載せ、それぞれ APP スコープにも反映する。
 * Schedule + ScheduleEditLog（＋必要なら Constraints）を1操作で記録するときに使う。
 * ローカルは1 grow、APP はオブジェクトごとに1 grow（平坦な変更ログ）。
 *
 * @param baseline その型がこのスコープに初登場のときに、起点として置く「編集前」の値。
 *   呼び出し側は編集前の値を手に持っているので、それを渡すのが確実
 *   （ストアから引き直すと、実データが手元に無いときに起点が欠ける＝#110）。
 *   渡されなかった型は APP の現在の参照で代替する。
 */
export function saveLocalBundle(
  store: StoreLike,
  localScopeIdValue: string,
  items: BundleItem[],
  baseline?: BundleItem[]
): void {
  // 起点は**1ノードにまとめて**置く。1件ずつ記録すると先頭のノードに一部の型しか載らず、
  // そこへ時間移動したときに残りが戻らない（doc の「まとめて巻き戻したとき元に戻れる」）。
  // 起点に置く候補は「今回記録するもの」と「呼び出し側が起点として渡したもの」の和集合。
  // items に無い型も起点に置けるようにしてある（例: 制約変更だけを記録するときも、
  // このスコープの持ち主である勤務表は起点に載っていないといけない）。
  const idOf = (item: BundleItem) => {
    const d = getDescriptor(item.type);
    if (!d) throw new Error(`save: type "${item.type}" が未登録です`);
    return d.getId(item.obj);
  };
  const wanted = new Map<string, { type: string; id: string }>();
  for (const item of [...items, ...(baseline ?? [])]) {
    const id = idOf(item);
    wanted.set(`${item.type}:${id}`, { type: item.type, id });
  }

  const baselines = [...wanted.values()]
    .map(({ type, id }) => {
      if (everInScope(store, localScopeIdValue, type, id)) return undefined;
      const given = baseline?.find((b) => b.type === type && idOf(b) === id);
      // 渡されていればそれを使う（確実）。無ければ APP の現在の参照で代替する
      return given
        ? refForItem(store, given)
        : refInScope(store, APP_SCOPE_ID, type, id);
    })
    .filter((ref): ref is StateRef => ref !== undefined);
  const creatingRoot = isScopeEmpty(store, localScopeIdValue);
  growWithRefs(store, localScopeIdValue, baselines);
  if (creatingRoot && baselines.length > 0) {
    // 起点は人の操作に対応しないノードなので、そう読めるよう名前を付ける
    // （付けないと「同じ状態が2つ並んでいる」ように見える）。
    const graph = graphOf(store, localScopeIdValue);
    const rootId = graph.state.rootNodeId;
    if (rootId) {
      store.dispatch(
        setGraph({
          scopeId: localScopeIdValue,
          graph: graph.setNodeLabel(rootId, "編集前").toJSON(),
        })
      );
    }
  }
  commitBundle(store, localScopeIdValue, items);
  for (const { type, obj } of items) {
    commitToScope(store, APP_SCOPE_ID, type, obj);
  }
}

/**
 * ローカルスコープに初登場なら、APP の現在値を起点として先に記録する。
 *
 * 判断も記録も**参照（StateRef）で行う**のが要点。以前は値を読んで判断していたため、
 * その値がメモリ上の CAS から追い出されていると「APP にも無い」と誤判定し、起点の記録を
 * 黙って飛ばしていた。結果、ローカル世界線の root にその型が載らず、そこへ時間移動しても
 * 状態が戻らない（#110）。参照はグラフに載っているので、追い出しの影響を受けない。
 */
function baselineRefFor(
  store: StoreLike,
  localId: string,
  type: string,
  obj: unknown
): StateRef | undefined {
  const d = getDescriptor(type);
  if (!d) throw new Error(`save: type "${type}" が未登録です`);
  const id = d.getId(obj);
  if (everInScope(store, localId, type, id)) return undefined; // 登場済み
  return refInScope(store, APP_SCOPE_ID, type, id);
}

function ensureLocalBaseline(
  store: StoreLike,
  localId: string,
  type: string,
  obj: unknown
): void {
  const ref = baselineRefFor(store, localId, type, obj);
  if (ref) growWithRefs(store, localId, [ref]);
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
