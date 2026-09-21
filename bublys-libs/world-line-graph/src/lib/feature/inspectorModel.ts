/**
 * inspectorModel — 世界線インスペクタが表示する行を組み立てる（純粋関数）
 *
 * 世界線は「参照（グラフ）」と「値（CAS）」が別々に生きている。参照は消えないが、
 * 値はメモリ上の CAS から追い出されて IndexedDB にだけ残る。この2つのズレを
 * 正しく言い当てるのがインスペクタの仕事なので、判定は純粋関数に切り出して固定する。
 * （デバッグ道具が嘘をつくと、無いより悪い）
 */
import { WorldLineGraph, type WorldLineGraphJson } from '../domain/WorldLineGraph';
import { TOMBSTONE_HASH } from '../domain/StateHash';
import type { StateRef } from '../domain/StateRef';
import type {
  InspectorNodeRow,
  InspectorRefRow,
  InspectorScopeRow,
  RefLocation,
} from '../ui/WorldLineInspectorView';

export { TOMBSTONE_HASH };

export type InspectorSources = {
  /** メモリ（Redux）の CAS */
  cas: Readonly<Record<string, unknown>>;
  /** IndexedDB にあるハッシュ。null は「まだ読んでいない」（＝断定しない） */
  idbHashes: ReadonlySet<string> | null;
  /** 人が明示的に IndexedDB から引いてきた値 */
  fetched: Readonly<Record<string, unknown>>;
};

/**
 * その参照が指す値がいまどこにあるか。
 *
 * まだ IndexedDB を読めていないうちは "lost"（消失）と言い切らない。
 * 読み込み中の一瞬を「もう復元できない」と表示すると、いちばん困る誤報になる。
 */
export function locateRef(hash: string, src: InspectorSources): RefLocation {
  if (hash === TOMBSTONE_HASH) return 'tombstone';
  if (src.cas[hash] !== undefined) return 'memory';
  if (src.idbHashes === null) return 'idb';
  return src.idbHashes.has(hash) ? 'idb' : 'lost';
}

const previewOf = (value: unknown): string => {
  if (value === null) return 'null（削除マーカー）';
  const json = JSON.stringify(value);
  return json.length > 200 ? `${json.slice(0, 200)}…` : json;
};

export function toRefRow(ref: StateRef, src: InspectorSources): InspectorRefRow {
  const value = src.cas[ref.hash] !== undefined ? src.cas[ref.hash] : src.fetched[ref.hash];
  return {
    type: ref.type,
    id: ref.id,
    hash: ref.hash,
    location: locateRef(ref.hash, src),
    preview: value !== undefined ? previewOf(value) : undefined,
  };
}

/**
 * スコープ一覧。メモリにあるものと IndexedDB にあるものの**和**を出す
 * （どちらか一方にしか無い状態こそが見たいものなので、片方だけ見てはいけない）。
 */
export function buildScopeRows(
  graphs: Readonly<Record<string, WorldLineGraphJson>>,
  idbScopeIds: readonly string[] | null
): InspectorScopeRow[] {
  const ids = new Set([...Object.keys(graphs), ...(idbScopeIds ?? [])]);
  return [...ids].sort().map((id) => {
    const json = graphs[id];
    const refs = json ? WorldLineGraph.fromJSON(json).getCurrentStateRefs() : [];
    const counts = new Map<string, number>();
    for (const r of refs) {
      if (r.hash === TOMBSTONE_HASH) continue; // 削除済みは「載っている」に数えない
      counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
    }
    return {
      scopeId: id,
      nodeCount: json ? Object.keys(json.nodes).length : 0,
      inMemory: json !== undefined,
      inIdb: (idbScopeIds ?? []).includes(id),
      apexNodeId: json?.apexNodeId ?? null,
      typeCounts: [...counts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => a.type.localeCompare(b.type)),
    };
  });
}

/** ノード一覧（古い順）。各行はそのノードで「変わったもの」＝差分だけを持つ */
export function buildNodeRows(
  graph: WorldLineGraph,
  src: InspectorSources
): InspectorNodeRow[] {
  const { nodes, apexNodeId, rootNodeId } = graph.state;
  const depthOf = (id: string): number => {
    let depth = 0;
    let cur = nodes[id]?.parentId ?? null;
    while (cur && depth < 1000) {
      depth++;
      cur = nodes[cur]?.parentId ?? null;
    }
    return depth;
  };
  return Object.values(nodes)
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((n) => ({
      id: n.id,
      parentId: n.parentId,
      timestamp: n.timestamp,
      label: n.label,
      intentLabel: n.intentLabel,
      worldLineId: n.worldLineId,
      isApex: n.id === apexNodeId,
      isRoot: n.id === rootNodeId,
      depth: depthOf(n.id),
      changed: n.changedRefs.map((ref) => toRefRow(ref, src)),
    }));
}

/** そのノード時点の「世界の全体状態」（root からの差分の畳み込み） */
export function buildStateRows(
  graph: WorldLineGraph,
  nodeId: string,
  src: InspectorSources
): InspectorRefRow[] {
  if (!graph.state.nodes[nodeId]) return [];
  return [...graph.getStateRefMapAt(nodeId).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, ref]) => toRefRow(ref, src));
}
