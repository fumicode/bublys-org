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
import {
  getDescriptor,
  homeScopeOf,
  liveTypes,
  pinnedTypesOf,
  type ObjectDescriptor,
} from "./framework.js";

/** アプリ全体の世界線スコープID */
export const APP_SCOPE_ID = "hotel";

/** 型ごとのローカル世界線スコープID */
export const localScopeId = (type: string, id: string): string => `${type}:${id}`;

/**
 * 削除マーカー（tombstone）のハッシュ。
 * removeObject が置く `null` の内容ハッシュは定数なので、CAS を読まずに
 * 「この参照は削除を表す」と判定できる。
 */
export const TOMBSTONE_HASH = computeStateHash(null);

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

/** 1回の grow でスコープに起こす変化。3種類を混ぜて1ノードにできる。 */
export type ScopeChange = {
  /** 値を記録する（新しい状態）。CAS に実データを載せ、参照を grow する */
  save?: BundleItem[];
  /**
   * 既にある参照をそのまま載せる。**値は読まない**のが要点。
   * 固定メンバーの焼き付け・起点の据え置きに使う。実データは CAS／永続ストアに
   * 既にあるので、メモリから追い出されていても記録は欠けない（#110）。
   */
  pin?: StateRef[];
  /** このスコープから外す（tombstone） */
  remove?: { type: string; id: string }[];
};

/**
 * 世界線に変化を記録する唯一の入口。**1回呼ぶ＝1ノード**。
 *
 * 更新後のグラフを返すのは、呼び出し側が続けてラベルを付けたりするため。
 */
export function growScope(
  store: StoreLike,
  scopeId: string,
  change: ScopeChange
): WorldLineGraph {
  const refs: StateRef[] = [];
  const casEntries: { hash: string; data: unknown }[] = [];

  for (const { type, obj } of change.save ?? []) {
    const d = getDescriptor(type);
    if (!d) throw new Error(`commit: type "${type}" が未登録です`);
    const id = d.getId(obj);
    const data = codecOf(d).toJSON(obj);
    const hash = computeStateHash(data);
    refs.push(createStateRef(type, id, hash));
    casEntries.push({ hash, data });
  }
  for (const ref of change.pin ?? []) refs.push(ref);
  for (const { type, id } of change.remove ?? []) {
    refs.push(createStateRef(type, id, TOMBSTONE_HASH));
    casEntries.push({ hash: TOMBSTONE_HASH, data: null });
  }

  if (refs.length === 0) return graphOf(store, scopeId);

  const updated = graphOf(store, scopeId).grow(refs);
  store.dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  if (casEntries.length > 0) {
    // Redux の CAS は 300 件で頭打ちなので、「今の世界」が参照する分は間引きから守る
    // （useCasScope の grow と同じ扱い）。守らないと、ファイル読み込み直後の 1 回の
    // 保存で、読み込んだ履歴ぶんが一気に評価対象になって現在値まで落ちうる。
    const protectHashes = updated.getCurrentStateRefs().map((ref) => ref.hash);
    store.dispatch(setCasEntries({ entries: casEntries, protectHashes }));
  }
  return updated;
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
  growScope(store, scopeId, { save: items });
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
 * そのオブジェクトがこのスコープに「無い」ことが確かか。
 *
 * 値が読めない理由は2つある: **本当に無い**／**メモリ上の CAS から追い出された**。
 * 既定値を作って保存してよいのは前者だけで、後者でやると中身のあるオブジェクトを
 * 空で上書きしてしまう（見ているだけでデータが壊れる）。
 * 判定は参照（グラフ）で行う。参照は追い出されないので、この2つを正しく分けられる。
 *
 * 「無ければ作る」を書くときは、値の falsy 判定ではなく必ずこれを通すこと。
 */
export function isAbsentInScope(
  store: StoreLike,
  scopeId: string,
  type: string,
  id: string
): boolean {
  const ref = refInScope(store, scopeId, type, id);
  return ref === undefined || ref.hash === TOMBSTONE_HASH;
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

/** スコープの apex にある、その型の参照すべて（削除済みは除く） */
export function refsOfTypeInScope(
  store: StoreLike,
  scopeId: string,
  type: string
): StateRef[] {
  const graph = graphOf(store, scopeId);
  const apex = graph.state.apexNodeId;
  if (!apex) return [];
  return graph
    .getStateRefsAt(apex)
    .filter((r) => r.type === type && r.hash !== TOMBSTONE_HASH);
}

/**
 * そのオーナー型のスコープが生まれるとき焼き付ける、固定メンバーの参照。
 * グローバル（アプリ全体スコープ）の**現在の**参照をそのまま使う。値は読まない。
 */
export function pinnableRefs(store: StoreLike, ownerType: string): StateRef[] {
  return pinnedTypesOf(ownerType).flatMap((type) =>
    refsOfTypeInScope(store, APP_SCOPE_ID, type)
  );
}

/**
 * ローカル世界線スコープID（`Schedule:<id>`）を、持ち主の型とIDに分解する。
 * 最初のコロンで切る（ID 側にコロンが含まれても持ち主は正しく取れる）。
 */
export function parseLocalScopeId(
  scopeId: string
): { ownerType: string; ownerId: string } | undefined {
  const i = scopeId.indexOf(":");
  if (i <= 0 || i === scopeId.length - 1) return undefined;
  return { ownerType: scopeId.slice(0, i), ownerId: scopeId.slice(i + 1) };
}

/**
 * 世界を誕生させる（冪等。すでにノードがあれば何もしない）。
 *
 * 起点ノード**1つ**に、次の2つをまとめて載せる:
 *   - 持ち主一式 … この世界を本籍とする live な型（勤務表・勤務帯セット・可能勤務帯…）
 *   - 固定メンバー … オーナー型の scope.pins が挙げる型の、グローバルの現在の参照すべて
 *
 * 誕生は**完全でなければならない**。一部の型しか載っていない起点を作ると、そこへ時間移動
 * したときに残りが戻らない（#110）。だから型を1箇所（記述子）から導いてまとめて置く。
 *
 * 値ではなく**参照**をコピーするのが要点。メモリ上の CAS から追い出されていても
 * 焼き付けが欠けない。呼び出し側が編集前の値を手に持っているときだけ seed で渡す
 * （APP にまだ無い新規作成時など）。
 */
export function ensureWorldBorn(
  store: StoreLike,
  scopeId: string,
  seed?: BundleItem[]
): void {
  if (!isScopeEmpty(store, scopeId)) return;
  const owner = parseLocalScopeId(scopeId);
  if (!owner) return;

  const idOfItem = (item: BundleItem) => {
    const d = getDescriptor(item.type);
    if (!d) throw new Error(`born: type "${item.type}" が未登録です`);
    return d.getId(item.obj);
  };

  // 固定メンバー（グローバルの現在の参照をそのまま）
  const refs: StateRef[] = [...pinnableRefs(store, owner.ownerType)];

  // 持ち主一式（この世界を本籍とする live な型を、持ち主IDで引く）
  for (const type of liveTypes()) {
    if (homeScopeOf(type, owner.ownerId) !== scopeId) continue;
    const given = seed?.find(
      (item) => item.type === type && idOfItem(item) === owner.ownerId
    );
    // 渡されていればその値から作る（確実）。無ければ APP の現在の参照で代替する
    const ref = given
      ? refForItem(store, given)
      : refInScope(store, APP_SCOPE_ID, type, owner.ownerId);
    if (ref && ref.hash !== TOMBSTONE_HASH) refs.push(ref);
  }

  if (refs.length === 0) return;

  const graph = growScope(store, scopeId, { pin: refs });
  const rootId = graph.state.rootNodeId;
  if (rootId) {
    // 起点は人の操作に対応しないノードなので、そう読めるよう名前を付ける
    // （付けないと「同じ状態が2つ並んでいる」ように見える）。
    store.dispatch(
      setGraph({
        scopeId,
        graph: graph.setNodeLabel(rootId, "編集前").toJSON(),
      })
    );
  }
}

/**
 * 投入した一式のうち、自分の世界を持つものをその場で誕生させる。
 * 例データ投入やファイル読み込みの直後に呼ぶ（それぞれの勤務表が固定メンバー入りで生まれる）。
 */
export function bornWorldsOf(store: StoreLike, items: BundleItem[]): void {
  const scopeIds = new Set<string>();
  for (const { type, obj } of items) {
    const d = getDescriptor(type);
    if (!d) continue;
    const scopeId = homeScopeOf(type, d.getId(obj));
    if (scopeId) scopeIds.add(scopeId);
  }
  for (const scopeId of scopeIds) ensureWorldBorn(store, scopeId);
}

/**
 * ノードに名前を付ける。ただし**新しく生まれたノードにだけ**。
 *
 * grow は打ち消しスナップ（WorldLineGraph.grow）で、見込みの状態が既存のノード
 * （祖先か直近の子）と一致すると、新しいノードを作らずそこへ moveTo する。
 * そのため「grow したあと apex に setNodeLabel」と素直に書くと、既にある別のノードの
 * 名前を黙って書き換えてしまう。grow の前に知っていたノードなら手を出さない。
 * 既に名前が付いているノードにも付けない（人が付けた名前を奪わない）。
 */
function labelIfNew(
  store: StoreLike,
  scopeId: string,
  nodeId: string,
  knownNodeIds: ReadonlySet<string>,
  label: string
): void {
  if (knownNodeIds.has(nodeId)) return; // スナップして既存ノードに乗った
  const graph = graphOf(store, scopeId);
  if (graph.state.nodes[nodeId]?.label) return;
  store.dispatch(
    setGraph({ scopeId, graph: graph.setNodeLabel(nodeId, label).toJSON() })
  );
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
 *
 * live な型は、記述子が宣言する本籍（homeScope）のローカル世界線にも記録する
 * （複数オブジェクトが同じスコープに相乗りする＝case B）。各オブジェクトがそのスコープに
 * 初登場するときは、編集前の状態を起点として先に記録する（まとめて巻き戻したとき元に戻れる）。
 *
 * アプリ全体スコープには常に書く。ここは「全世界の最新値インデックス」で、
 * 勤務表一覧やスタッフ詳細のような**世界をまたぐ問い合わせ**がこれを読む。
 */
export function saveObject(store: StoreLike, type: string, obj: unknown): void {
  const d = getDescriptor(type);
  if (!d) throw new Error(`save: type "${type}" が未登録です`);

  const localId = homeScopeOf(type, d.getId(obj));
  if (localId) {
    // 世界がまだ無ければ、ここで生まれる（持ち主一式＋固定メンバーを1ノードで）
    ensureWorldBorn(store, localId);
    // 既に生まれている世界に**初登場**する型は、編集前を起点として先に置く
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

  // 世界がまだ無ければ、ここで生まれる（持ち主一式＋固定メンバーを1ノードで）。
  // 起点に置く値は baseline（呼び出し側が持っている編集前）を優先する。
  ensureWorldBorn(store, localScopeIdValue, baseline);

  // 既に生まれている世界に**初登場**する型は、編集前の状態を起点として先に置く。
  // 誕生のときにはまだ存在しなかった型（後から作られる制約など）がこれにあたる。
  const lateBaselines = [...wanted.values()]
    .map(({ type, id }) => {
      if (everInScope(store, localScopeIdValue, type, id)) return undefined;
      const given = baseline?.find((b) => b.type === type && idOf(b) === id);
      // 渡されていればそれを使う（確実）。無ければ APP の現在の参照で代替する
      return given
        ? refForItem(store, given)
        : refInScope(store, APP_SCOPE_ID, type, id);
    })
    .filter((ref): ref is StateRef => ref !== undefined);
  growWithRefs(store, localScopeIdValue, lateBaselines);

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
 * グローバルの現在値を読み、transform した値を返す（**保存はしない**）。
 *
 * 誕生を1ノードにまとめたいときに使う。ここで saveObject してしまうと、
 * その1件だけで世界が生まれてしまい、固定メンバーの載らない起点ができる。
 */
export function adoptGlobalValue<T>(
  store: StoreLike,
  type: string,
  transform: (global: T) => T,
  globalId: string
): T | undefined {
  const global = readFromScope<T>(store, APP_SCOPE_ID, type, globalId);
  if (global === undefined) return undefined;
  return transform(global);
}

/**
 * 同じ親から複数の「案」を兄弟ブランチとして記録する（世界線で見比べる用）。
 * - 書き込み先はローカル世界線スコープのみ（アプリ全体は現状のまま）。
 * - スコープが空なら baseObj を root として置き、それを共通の親にする。空でなければ現在の apex を親とする。
 * - 各案は共通の親から grow する：apex に子ができると grow が自動でブランチを作る仕様なので、
 *   2案目以降は親へ moveTo してから grow すると兄弟になる。各ノードに label を付ける。
 * - extras があればその案の Schedule と同一ノードに載せる（例: ScheduleEditLog）。
 * - 書き込み後は先頭の案（案1）に着地させる：ローカル apex を案1へ移す
 *   （世界線ビューの apex と、実際に表示される状態を案1で一致させる）。
 * 返り値: 親ノードIDと、書き込んだ各案のノードID。
 */
export function commitCandidates(
  store: StoreLike,
  scopeId: string,
  type: string,
  baseObj: unknown,
  candidates: { obj: unknown; label?: string; extras?: BundleItem[] }[]
): { parentNodeId: string; nodeIds: string[] } {
  // 共通の親（root）を作るのも誕生の一種。作る場所は ensureWorldBorn 一本にする
  // （ここで commitToScope すると勤務表だけの起点ができ、固定メンバーが載らない）。
  ensureWorldBorn(store, scopeId, [{ type, obj: baseObj }]);
  const parentNodeId = graphOf(store, scopeId).state.apexNodeId as string;
  const nodeIds: string[] = [];

  candidates.forEach((c, i) => {
    if (i > 0) {
      // 親へ戻してから grow → 兄弟ブランチになる
      const moved = graphOf(store, scopeId).moveTo(parentNodeId);
      store.dispatch(setGraph({ scopeId, graph: moved.toJSON() }));
    }
    const items: BundleItem[] = [{ type, obj: c.obj }, ...(c.extras ?? [])];
    // ラベルを付けてよいのは「この commit で生まれたノード」だけ。案が既存の状態と
    // 一致すると grow はスナップして既存ノードへ移るので、その名前を奪わない。
    const knownNodeIds = new Set(Object.keys(graphOf(store, scopeId).state.nodes));
    commitBundle(store, scopeId, items);
    const apex = graphOf(store, scopeId).state.apexNodeId as string;
    nodeIds.push(apex);
    if (c.label) labelIfNew(store, scopeId, apex, knownNodeIds, c.label);
  });

  // 案1に着地：ローカル apex を案1へ移す。
  // 読みもこの世界からなので、移すだけで画面が案1になる（以前はここで案1の状態を
  // アプリ全体スコープへ書き戻していた。restore と同じ橋渡しで、もう要らない）。
  const landing = nodeIds[0];
  if (landing) {
    store.dispatch(
      setGraph({ scopeId, graph: graphOf(store, scopeId).moveTo(landing).toJSON() })
    );
  }

  return { parentNodeId, nodeIds };
}

/**
 * オブジェクトを削除する（墓標を置く）。
 *
 * **{@link saveObject} と同じ解決式を使う。** 住所は1つなので、保存が本籍の世界線と
 * グローバル台帳の両方へ書くなら、削除も両方へ書かなければならない。
 * 台帳にだけ墓標を置くと、消したはずのオブジェクトが自分の世界では生き続け、
 * そこで1回でも編集すると台帳へ書き戻されて**復活する**（実際にそうなっていた）。
 *
 * 固定メンバー（pinned）は本籍を持たないので台帳だけが動く。これは仕様どおりで、
 * 「グローバルの名簿から消しても、焼き付けた世界からは消えない」がまさに固定の意味。
 */
export function removeObject(store: StoreLike, type: string, id: string): void {
  const localId = homeScopeOf(type, id);
  // まだ生まれていない世界に墓標だけ置くと、起点が墓標の世界ができてしまう
  if (localId && !isScopeEmpty(store, localId)) {
    growScope(store, localId, { remove: [{ type, id }] });
  }
  growScope(store, APP_SCOPE_ID, { remove: [{ type, id }] });
}
