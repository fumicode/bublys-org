/**
 * グラフを**決定的に**歩く道具。
 *
 * 挿入順に頼ってはいけない。グラフは JSON を往復するので、キーの順は保存と読み込みで
 * 変わりうる。順が変わると図の配置が変わり、「同じ入力なら同じ出力」が崩れる
 * （layout3d.test.ts がそれを固定している）。だから並べ方はここに寄せる。
 */
import type { WorldLineGraph } from '../../domain/WorldLineGraph.js';

/** ノードを (timestamp, id) で決定的に並べる。挿入順に頼ると JSON 往復で崩れる */
export function sortedNodes(graph: WorldLineGraph) {
  return Object.values(graph.state.nodes).sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  );
}

/** 席の一覧を全スコープ・全ノードの changedRefs から決定的に集める */
export function collectTypedKeys(
  graphs: Readonly<Record<string, WorldLineGraph>>,
  scopeIds: readonly string[]
): { type: string; key: string }[] {
  const out: { type: string; key: string }[] = [];
  const seen = new Set<string>();
  for (const scopeId of scopeIds) {
    const graph = graphs[scopeId];
    if (!graph) continue;
    for (const node of sortedNodes(graph)) {
      for (const ref of node.changedRefs) {
        const key = `${ref.type}:${ref.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: ref.type, key });
      }
    }
  }
  return out;
}
