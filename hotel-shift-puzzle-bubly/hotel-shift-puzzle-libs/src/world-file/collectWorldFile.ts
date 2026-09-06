/**
 * 今の世界（世界線グラフ＋履歴の全状態）を 1 つのファイル内容に集める。
 *
 * 注意すべきなのは「CAS の本体は Redux ではない」こと。
 * Redux の `worldLineGraph.cas` は直近 300 件に間引かれており（`MAX_CAS_ENTRIES`）、
 * 溢れた分は IndexedDB（アカシックレコード）にだけ残る。履歴ごと保存するには
 * Redux に無いハッシュを IndexedDB から取り直す必要がある。
 */
import { loadStatesFromIDB } from "@bublys-org/world-line-graph";
import type { WorldLineGraphJson } from "@bublys-org/world-line-graph";
import {
  WORLD_FILE_FORMAT,
  WORLD_FILE_VERSION,
  type HotelWorldFile,
} from "./worldFileFormat.js";
import { isDocumentScope } from "./documentScopes.js";

type StoreLike = {
  getState: () => {
    worldLineGraph?: {
      graphs?: Record<string, WorldLineGraphJson>;
      cas?: Record<string, unknown>;
    };
  };
};

export interface CollectResult {
  file: HotelWorldFile;
  /** 参照されているのに Redux にも IndexedDB にも無かったハッシュ（履歴の欠損） */
  unresolvedHashes: string[];
  /** 集めたスコープ数・状態数（画面に出す用） */
  stats: { scopeCount: number; nodeCount: number; casCount: number };
}

/**
 * 保存対象のスコープと、そこから参照される全ハッシュを集めて `HotelWorldFile` を作る。
 *
 * `note` は人が付けるメモ（「9月・詰みシナリオ」など）。
 */
export async function collectWorldFile(
  store: StoreLike,
  note?: string
): Promise<CollectResult> {
  const wl = store.getState().worldLineGraph;
  const allGraphs = wl?.graphs ?? {};
  const reduxCas = wl?.cas ?? {};

  const graphs: Record<string, WorldLineGraphJson> = {};
  const wanted = new Set<string>();
  let nodeCount = 0;

  for (const [scopeId, graph] of Object.entries(allGraphs)) {
    if (!isDocumentScope(scopeId)) continue;
    graphs[scopeId] = graph;
    for (const node of Object.values(graph.nodes)) {
      nodeCount++;
      for (const ref of node.changedRefs) wanted.add(ref.hash);
    }
  }

  // まず Redux にある分を拾い、足りない分だけ IndexedDB に取りに行く。
  const cas: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const hash of wanted) {
    if (hash in reduxCas) {
      cas[hash] = reduxCas[hash];
    } else {
      missing.push(hash);
    }
  }

  const unresolvedHashes: string[] = [];
  if (missing.length > 0) {
    const loaded = await loadStatesFromIDB(missing);
    for (const hash of missing) {
      if (loaded.has(hash)) {
        cas[hash] = loaded.get(hash);
      } else {
        unresolvedHashes.push(hash);
      }
    }
  }

  const file: HotelWorldFile = {
    format: WORLD_FILE_FORMAT,
    formatVersion: WORLD_FILE_VERSION,
    savedAt: new Date().toISOString(),
    ...(note?.trim() ? { note: note.trim() } : {}),
    graphs,
    cas,
  };

  return {
    file,
    unresolvedHashes,
    stats: {
      scopeCount: Object.keys(graphs).length,
      nodeCount,
      casCount: Object.keys(cas).length,
    },
  };
}

/**
 * ファイルに書くテキストにする。
 *
 * 2 スペースインデントにするのは、エディタで開いて 1 セルだけ書き換えて読み直す、
 * git で差分を見る、という使い方を想定しているため。サイズは数 MB 程度なので
 * 整形しても実害はない。
 */
export function serializeWorldFile(file: HotelWorldFile): string {
  return JSON.stringify(file, null, 2);
}
