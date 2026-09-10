/**
 * 各ノード時点の「世界の全体状態」を DFS の差分適用で求める。
 *
 * getStateRefMapAt を全ノードぶん呼ぶと O(ノード数 × 深さ) になるうえ、
 * getPathToNode は壊れたグラフで throw する（実際に空グラフや孤児ノードは実在する）。
 * ここでは root から DFS で降りながら適用・巻き戻しをするので O(Σ|changedRefs|)。
 *
 * **changed の定義が要点**: `node.changedRefs` に入っているか、ではなく
 * **親ノードとハッシュが違うか**で決める。grow は渡された参照をそのまま焼くので、
 * 値が変わっていない参照も changedRefs に入りうる（既存テスト
 * 「編集で値が変わらない型は、起点と次のノードで同じ参照のまま」がその状況）。
 * ここを間違えると「変わったものを強調する」が嘘になる。
 */
import type { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import type { StateRef } from '../../domain/StateRef.js';

export type CellState = {
  readonly key: string;
  readonly ref: StateRef;
  readonly changed: boolean;
  readonly inChangedRefs: boolean;
};

export type FoldResult = {
  /** nodeId → その時点の全体状態（key 順は呼び出し側で決める） */
  readonly statesByNode: ReadonlyMap<string, readonly CellState[]>;
  /** 親を辿れず、どの経路からも到達しなかったノード */
  readonly orphanNodeIds: readonly string[];
  /** 親より古い timestamp を持つノード */
  readonly clockAnomalyNodeIds: readonly string[];
  /** changedRefs に入っていたのに値は変わっていなかった参照の数 */
  readonly unprunedChangedCount: number;
};

const keyOf = (ref: StateRef) => `${ref.type}:${ref.id}`;

/** 子を (timestamp, id) で明示ソートする。挿入順に頼ると JSON 往復で崩れる */
function sortedChildren(
  graph: WorldLineGraph,
  childrenMap: Record<string, string[]>,
  nodeId: string
): string[] {
  const ids = childrenMap[nodeId] ?? [];
  const nodes = graph.state.nodes;
  return [...ids].sort((a, b) => {
    const ta = nodes[a]?.timestamp ?? 0;
    const tb = nodes[b]?.timestamp ?? 0;
    return ta - tb || a.localeCompare(b);
  });
}

export function foldCellStates(graph: WorldLineGraph): FoldResult {
  const { nodes, rootNodeId } = graph.state;
  const statesByNode = new Map<string, readonly CellState[]>();
  const clockAnomalyNodeIds: string[] = [];
  let unprunedChangedCount = 0;

  if (rootNodeId === null || !nodes[rootNodeId]) {
    return {
      statesByNode,
      orphanNodeIds: Object.keys(nodes),
      clockAnomalyNodeIds,
      unprunedChangedCount: 0,
    };
  }

  const childrenMap = graph.getChildrenMap();
  const visited = new Set<string>();
  /** いま辿っている経路での現在値 */
  const current = new Map<string, StateRef>();

  // 明示スタックで DFS（深い世界線で再帰が溢れないように）
  type Frame = { nodeId: string; undo: [string, StateRef | undefined][]; entered: boolean };
  const stack: Frame[] = [{ nodeId: rootNodeId, undo: [], entered: false }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.entered) {
      // 帰り道：この節で書き換えたものを**逆順に**戻す。
      // 同じキーが1ノードの changedRefs に2回入ることがあり、前から戻すと
      // 途中の値が残って兄弟の枝へ漏れる
      for (let i = frame.undo.length - 1; i >= 0; i--) {
        const [key, prev] = frame.undo[i];
        if (prev === undefined) current.delete(key);
        else current.set(key, prev);
      }
      stack.pop();
      continue;
    }
    frame.entered = true;

    const node = nodes[frame.nodeId];
    if (!node) {
      stack.pop();
      continue;
    }
    visited.add(frame.nodeId);

    const parent = node.parentId ? nodes[node.parentId] : undefined;
    if (parent && node.timestamp < parent.timestamp) {
      clockAnomalyNodeIds.push(node.id);
    }

    const changedKeys = new Map<string, boolean>(); // key → 値が変わったか
    for (const ref of node.changedRefs) {
      const key = keyOf(ref);
      const prev = current.get(key);
      const changed = prev?.hash !== ref.hash;
      if (!changed) unprunedChangedCount++;
      changedKeys.set(key, changed);
      frame.undo.push([key, prev]);
      current.set(key, ref);
    }

    const cells: CellState[] = [];
    for (const [key, ref] of current) {
      cells.push({
        key,
        ref,
        changed: changedKeys.get(key) ?? false,
        inChangedRefs: changedKeys.has(key),
      });
    }
    statesByNode.set(frame.nodeId, cells);

    for (const childId of sortedChildren(graph, childrenMap, frame.nodeId)) {
      if (visited.has(childId)) continue; // 壊れたグラフの循環対策
      stack.push({ nodeId: childId, undo: [], entered: false });
    }
  }

  const orphanNodeIds = Object.keys(nodes).filter((id) => !visited.has(id));
  return { statesByNode, orphanNodeIds, clockAnomalyNodeIds, unprunedChangedCount };
}
