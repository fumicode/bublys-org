/**
 * 板と板をつなぐ線。世界線のエッジと、同一性のレール。
 *
 * どちらも「親ノードの板 → 子ノードの板」を辿るだけなので、レイアウトの本体から
 * 切り離せる。座標は geometry.ts の式を通す（ここで式を書き写さない）。
 */
import { cellCenterWorld } from './geometry.js';
import { sortedNodes } from './graphWalk.js';
import type { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import type { Edge3D, IdentityLink3D, Plate3D } from './types.js';

/** 線を引くのに要る、スコープ1つぶんの最小の情報 */
export type LinkScope = {
  readonly scopeId: string;
  readonly graph: WorldLineGraph;
};

/**
 * 世界線のエッジ（親ノード → 子ノード）。
 * 同じレーンなら時間の流れ、違うレーンなら分岐として描き分ける。
 */
export function buildEdges(
  scopes: readonly LinkScope[],
  platesByScopeNode: ReadonlyMap<string, Plate3D>
): Edge3D[] {
  const edges: Edge3D[] = [];
  for (const c of scopes) {
    for (const node of sortedNodes(c.graph)) {
      if (!node.parentId) continue;
      const from = platesByScopeNode.get(`${c.scopeId} ${node.parentId}`);
      const to = platesByScopeNode.get(`${c.scopeId} ${node.id}`);
      if (!from || !to) continue;
      edges.push({
        from: from.origin,
        to: to.origin,
        scopeId: c.scopeId,
        kind: from.origin[1] === to.origin[1] ? 'time' : 'branch',
      });
    }
  }

  return edges;
}

/**
 * 同一性のレール（同じ `type:id` を時間方向につなぐ線）。
 *
 * 席は同じ世界のどのノードでも同じ位置なので、この線は時間軸に平行なまっすぐな
 * レールになる。「同じ ■ は同じもの」を図で言うのがこの線の仕事。
 * 消えたオブジェクトはそこで途切れる（**墓標より先へは伸ばさない**。伸ばすと
 * 消えたものが繋がって見えて嘘になる）。
 */
export function buildIdentityRails(
  scopes: readonly LinkScope[],
  platesByScopeNode: ReadonlyMap<string, Plate3D>,
  cellPitch: number
): IdentityLink3D[] {
  const identities: IdentityLink3D[] = [];
  for (const c of scopes) {
    for (const node of sortedNodes(c.graph)) {
      if (!node.parentId) continue;
      const from = platesByScopeNode.get(`${c.scopeId} ${node.parentId}`);
      const to = platesByScopeNode.get(`${c.scopeId} ${node.id}`);
      if (!from || !to) continue;
      const parentKeys = new Map(from.cells.map((cell) => [cell.key, cell]));
      for (const cell of to.cells) {
        const prev = parentKeys.get(cell.key);
        // 親に居なかった＝ここで生まれたもの。つなぐ相手がいない
        if (!prev || prev.action === 'deleted') continue;
        identities.push({
          from: cellCenterWorld(from, prev.slot, cellPitch),
          to: cellCenterWorld(to, cell.slot, cellPitch),
          key: cell.key,
          scopeId: c.scopeId,
          action: cell.action,
          role: cell.role,
        });
      }
    }
  }
  return identities;
}
