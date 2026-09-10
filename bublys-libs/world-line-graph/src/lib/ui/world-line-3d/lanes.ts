/**
 * 分岐レーンの割り当て（Y軸）。
 *
 * git のグラフと同じ考え方: 子のうち親と同じ worldLineId のものが親のレーンを継ぎ、
 * 他は新しいレーンへ払い出す。こうすると「本線がまっすぐ、枝が横へ逸れる」絵になる。
 *
 * 子の順序は必ず (timestamp, id) で明示ソートする。getChildrenMap は
 * Object.values の挿入順に依存するので、JSON 往復で順序が変わりうる。
 */
import type { WorldLineGraph } from '../../domain/WorldLineGraph.js';

export type LaneAssignment = {
  /** nodeId → レーン番号（0 が本線） */
  readonly of: ReadonlyMap<string, number>;
  readonly laneCount: number;
};

export function assignLanes(graph: WorldLineGraph): LaneAssignment {
  const { nodes, rootNodeId } = graph.state;
  const of = new Map<string, number>();
  if (rootNodeId === null || !nodes[rootNodeId]) return { of, laneCount: 0 };

  const childrenMap = graph.getChildrenMap();
  let nextLane = 0;
  const visited = new Set<string>();
  const stack: { nodeId: string; lane: number }[] = [
    { nodeId: rootNodeId, lane: nextLane++ },
  ];

  while (stack.length > 0) {
    const { nodeId, lane } = stack.pop() as { nodeId: string; lane: number };
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    of.set(nodeId, lane);

    const node = nodes[nodeId];
    if (!node) continue;
    const children = [...(childrenMap[nodeId] ?? [])].sort((a, b) => {
      const ta = nodes[a]?.timestamp ?? 0;
      const tb = nodes[b]?.timestamp ?? 0;
      return ta - tb || a.localeCompare(b);
    });

    // 親のレーンを継ぐのは「同じ worldLineId の子」のうち最初の1つだけ
    let inherited = false;
    // 後入れ先出しなので、逆順に積んで元の順で処理させる
    const assigned: { nodeId: string; lane: number }[] = [];
    for (const childId of children) {
      const child = nodes[childId];
      if (!child) continue;
      if (!inherited && child.worldLineId === node.worldLineId) {
        inherited = true;
        assigned.push({ nodeId: childId, lane });
      } else {
        assigned.push({ nodeId: childId, lane: nextLane++ });
      }
    }
    for (let i = assigned.length - 1; i >= 0; i--) stack.push(assigned[i]);
  }

  return { of, laneCount: nextLane };
}
