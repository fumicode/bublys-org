/**
 * ファイルの中身で「今の世界」を丸ごと置き換える。
 *
 * ## 順番が効く 3 つのこと
 *
 * 1. **先に IndexedDB へ全状態を書く。**
 *    Redux の CAS は 300 件で頭打ち（`MAX_CAS_ENTRIES`）なので、履歴ぶんは Redux に
 *    載せきれない。載らなかったハッシュは `useCasScope` が必要になった時点で
 *    IndexedDB から取り直す仕組みなので、先に IndexedDB を満たしておけば
 *    「過去のノードを開いたら空だった」が起きない。
 *
 * 2. **CAS を先に、グラフを後に dispatch する。**
 *    `useCasScope` はレンダー中に `graph.getCurrentStateRefs()` を引き、
 *    `cas[ref.hash]` が無いオブジェクトは黙って居ないものとして扱う。
 *    グラフだけ先に入れ替わったフレームが 1 枚でもあると、その瞬間
 *    「全部のオブジェクトが消えた世界」が観測されてしまう。
 *
 * 3. **await をまたがず、同期の 1 ブロックで dispatch する。**
 *    途中でレンダーが挟まると 2 と同じことが起きる。await はすべてこの関数の
 *    前半で終わらせ、後半は同期にする。
 *
 * ## 全置き換えの作法
 * 今あるスコープのうち、ファイルに無いものは空グラフで上書きする。
 * `deleteScope` を使わないのは、キーごと消えると `useCasScope` の
 * 「rootNodeId が null なら initialObjects で root を作る」経路に落ちる型があり、
 * 消したそばから新しい世界が生える危険があるため。空グラフなら「何も無い世界」で安定する。
 */
import {
  WorldLineGraph,
  setGraph,
  setCasEntries,
  saveStatesToIDB,
} from "@bublys-org/world-line-graph";
import type { WorldLineGraphJson } from "@bublys-org/world-line-graph";
import type { HotelWorldFile } from "./worldFileFormat.js";
import { isDocumentScope } from "./documentScopes.js";

type StoreLike = {
  getState: () => {
    worldLineGraph?: {
      graphs?: Record<string, WorldLineGraphJson>;
      cas?: Record<string, unknown>;
    };
  };
  dispatch: (action: unknown) => void;
};

const EMPTY_GRAPH: WorldLineGraphJson = WorldLineGraph.empty().toJSON();

/**
 * 保存対象のスコープをすべて空にする（＝この世界を白紙に戻す）。
 *
 * `deleteScope` ではなく空グラフで上書きするのは applyWorldFile と同じ理由
 * （キーごと消すと initialObjects 経路で新しい世界が生えうる）。
 * 「白紙から始める」と「例データ読み込み」の前処理として使う。
 */
export function clearDocumentScopes(store: StoreLike): void {
  const graphs = store.getState().worldLineGraph?.graphs ?? {};
  for (const scopeId of Object.keys(graphs)) {
    if (isDocumentScope(scopeId)) {
      store.dispatch(setGraph({ scopeId, graph: EMPTY_GRAPH }));
    }
  }
}

export interface ApplyResult {
  /** 読み込んだスコープ数 */
  loadedScopes: number;
  /** 空にした（ファイルに無かった）スコープ数 */
  clearedScopes: number;
  /** Redux／IndexedDB に入れた状態データ数 */
  casCount: number;
}

/**
 * ファイルの内容で世界を全置き換えする。
 * 呼ぶ前に `validateWorldFile` を通しておくこと（壊れたグラフはレンダー中に例外を投げる）。
 */
export async function applyWorldFile(
  store: StoreLike,
  file: HotelWorldFile
): Promise<ApplyResult> {
  const entries = Object.entries(file.cas).map(([hash, data]) => ({ hash, data }));

  // 1. 履歴ぶんも含めてアカシックレコード（IndexedDB）へ先に書く。
  //    ここが失敗したら Redux は触らずに投げる（中途半端な世界を作らない）。
  if (entries.length > 0) {
    await saveStatesToIDB(entries);
  }

  // 2. 各スコープの apex（＝読み込み直後に画面が必要とする状態）のハッシュを集める。
  //    Redux の CAS は 300 件で溢れるので、少なくともこれだけは間引かれないよう保護する。
  const protectHashes: string[] = [];
  for (const graph of Object.values(file.graphs)) {
    for (const ref of WorldLineGraph.fromJSON(graph).getCurrentStateRefs()) {
      protectHashes.push(ref.hash);
    }
  }

  // 3. 今あるスコープのうち、ファイルに無いものを洗い出す（全置き換えのため）。
  const currentScopeIds = Object.keys(store.getState().worldLineGraph?.graphs ?? {});
  const staleScopeIds = currentScopeIds.filter(
    (scopeId) => isDocumentScope(scopeId) && !(scopeId in file.graphs)
  );

  // 4. ここから同期。CAS → 空にするスコープ → ファイルのスコープ、の順で入れる。
  if (entries.length > 0) {
    store.dispatch(setCasEntries({ entries, protectHashes }));
  }
  for (const scopeId of staleScopeIds) {
    store.dispatch(setGraph({ scopeId, graph: EMPTY_GRAPH }));
  }
  for (const [scopeId, graph] of Object.entries(file.graphs)) {
    store.dispatch(setGraph({ scopeId, graph }));
  }

  return {
    loadedScopes: Object.keys(file.graphs).length,
    clearedScopes: staleScopeIds.length,
    casCount: entries.length,
  };
}
