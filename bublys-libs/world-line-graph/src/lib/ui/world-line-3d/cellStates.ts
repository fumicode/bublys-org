/**
 * 各ノード時点の「世界の全体状態」を DFS の差分適用で求める。
 *
 * getStateRefMapAt を全ノードぶん呼ぶと O(ノード数 × 深さ) になるうえ、
 * getPathToNode は壊れたグラフで throw する（実際に空グラフや孤児ノードは実在する）。
 * ここでは root から DFS で降りながら適用・巻き戻しをするので O(Σ|changedRefs|)。
 *
 * **判定が要点**: `node.changedRefs` に入っているか、ではなく **親ノードとハッシュが
 * 違うか**で「何が起きたか」を決める。grow は渡された参照をそのまま焼くので、
 * 値が変わっていない参照も changedRefs に入りうる（既存テスト
 * 「編集で値が変わらない型は、起点と次のノードで同じ参照のまま」がその状況）。
 * ここを間違えると「何が起きたかを色で語る」が丸ごと嘘になる。
 *
 * 消されたオブジェクトは、**消された瞬間のノードにだけ墓標として現れ、それ以降は
 * 出てこない**。もう存在しないものを描き続けるのは嘘なので。
 */
import type { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import type { StateRef } from '../../domain/StateRef.js';
import { TOMBSTONE_HASH } from '../../domain/StateHash.js';
import type { CellAction } from './types.js';

export { TOMBSTONE_HASH };

export type CellState = {
  readonly key: string;
  readonly ref: StateRef;
  /** このノードで何が起きたか */
  readonly action: CellAction;
  /** 参照としては changedRefs に入っていたか（action とのズレを数えるため） */
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
  /**
   * 現在地（apex）時点の**生の**参照表。key → ref。
   *
   * ★ statesByNode の cells ではなくこちらを使うこと。cells は「消された瞬間の
   * ノードにだけ墓標を置き、それ以降は落とす」ので、削除の次のノードへ apex が
   * 進むとキーごと消える。「外で消された」と「外に一度も無い」を分けたい側からは
   * 区別が付かなくなる。ここは墓標をそのまま残す。
   *
   * apex が無い／到達できないときは null（＝比べ先が無い。'same' に倒してはいけない）
   */
  readonly refsAtApex: ReadonlyMap<string, StateRef> | null;
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
  const { nodes, rootNodeId, apexNodeId } = graph.state;
  let refsAtApex: Map<string, StateRef> | null = null;
  const statesByNode = new Map<string, readonly CellState[]>();
  const clockAnomalyNodeIds: string[] = [];
  let unprunedChangedCount = 0;

  if (rootNodeId === null || !nodes[rootNodeId]) {
    return {
      statesByNode,
      orphanNodeIds: Object.keys(nodes),
      clockAnomalyNodeIds,
      unprunedChangedCount: 0,
      refsAtApex: null,
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

    /** key → このノードで起きたこと（changedRefs に載っていたものだけ） */
    const actions = new Map<string, CellAction>();
    for (const ref of node.changedRefs) {
      const key = keyOf(ref);
      const prev = current.get(key);
      const gone = prev === undefined || prev.hash === TOMBSTONE_HASH;
      let action: CellAction;
      if (ref.hash === TOMBSTONE_HASH) {
        action = 'deleted';
      } else if (gone) {
        // まだ無かった（または一度消えた）ものが現れた＝作られた
        action = 'created';
      } else if (prev.hash !== ref.hash) {
        action = 'changed';
      } else {
        // 参照は載っているが値は同じ。grow は渡された参照をそのまま焼くので起きる
        action = 'unchanged';
        unprunedChangedCount++;
      }
      actions.set(key, action);
      frame.undo.push([key, prev]);
      current.set(key, ref);
    }

    const cells: CellState[] = [];
    for (const [key, ref] of current) {
      const action = actions.get(key);
      if (ref.hash === TOMBSTONE_HASH && action !== 'deleted') {
        // もう消えたもの。消された瞬間のノードにだけ墓標を置き、それ以降は描かない
        continue;
      }
      cells.push({
        key,
        ref,
        action: action ?? 'unchanged',
        inChangedRefs: actions.has(key),
      });
    }
    statesByNode.set(frame.nodeId, cells);
    // 現在地に着いたところで、墓標込みの参照表を1回だけ複製して持ち帰る。
    // DFS の副産物なので追加の走査は要らない（O(席数) を1回）
    if (frame.nodeId === apexNodeId) refsAtApex = new Map(current);

    for (const childId of sortedChildren(graph, childrenMap, frame.nodeId)) {
      if (visited.has(childId)) continue; // 壊れたグラフの循環対策
      stack.push({ nodeId: childId, undo: [], entered: false });
    }
  }

  const orphanNodeIds = Object.keys(nodes).filter((id) => !visited.has(id));
  return {
    statesByNode,
    orphanNodeIds,
    clockAnomalyNodeIds,
    unprunedChangedCount,
    refsAtApex,
  };
}
