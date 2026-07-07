import { WorldLineGraph } from '../domain/WorldLineGraph.js';

/**
 * world-line グラフを「根が下・世代が進むほど上に伸びる木」として配置するための
 * 純粋なレイアウト計算。React/DOM/canvas に依存しない（ユニットテスト可能）。
 *
 * 世界線データ（WorldLineGraph）自体は一切書き換えない——あくまで見た目の
 * レイアウトを計算するだけの読み取り専用の関数。
 */

export type TreeNodeLayout = {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly subtreeWidth: number;
  readonly isLeaf: boolean;
  readonly color: string;
};

export type TreeEdge = {
  readonly from: string;
  readonly to: string;
  /**
   * この枝1本に畳み込まれた元の編集（grow）の回数——分岐せず一本道が
   * 続いた区間ほど大きくなる。分岐の広がり（subtreeWidth）が無くても、
   * 同じ枝で何度も編集を重ねたなら幹らしく太く見せるための材料。
   */
  readonly editCount: number;
};

export type TreeLayout = {
  readonly nodes: Map<string, TreeNodeLayout>;
  readonly edges: TreeEdge[];
  readonly minX: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** 葉1つぶんの横間隔（world単位）。分岐の広がり方を決める。 */
const LEAF_DX = 32;
/**
 * 木全体の高さ（world単位）。分岐の段数がいくつあってもこの高さに収める——
 * 「一枚の木のスケッチ」を目指し、履歴がどれだけ長くても木が際限なく縦に
 * 伸びないようにする。段数が多いほど1段あたりの間隔が詰まるだけで、
 * 全体の高さは変わらない。
 */
export const TREE_HEIGHT = 180;

const COLOR_PALETTE = [
  '#5ec5ff', '#ffb05e', '#7ee787', '#ff6b9d',
  '#b58cff', '#ffe066', '#65d6c8', '#ff8a65',
];

const EMPTY_LAYOUT: TreeLayout = { nodes: new Map(), edges: [], minX: 0, maxX: 0, maxY: 0 };

/**
 * 「意味のあるノード」だけを残す: 分岐点（子が2つ以上）・葉（子が0）・root・apex。
 * 一本道（子がちょうど1つ）の中間ノードは意味のあるノードに含めない——
 * 分岐点で何を選んだかが分かれば思考プロセスは追えるので、一手一手を
 * 逐一ノードとして描き分ける必要はない、という考え方に基づく。
 */
function selectSignificantIds(
  graph: WorldLineGraph,
  childrenMap: Record<string, string[]>
): Set<string> {
  const { nodes, rootNodeId, apexNodeId } = graph.state;
  const significant = new Set<string>();
  for (const id of Object.keys(nodes)) {
    const kids = childrenMap[id] ?? [];
    if (id === rootNodeId || id === apexNodeId || kids.length !== 1) {
      significant.add(id);
    }
  }
  return significant;
}

/**
 * 意味のあるノードだけを残した「縮約後」の親子関係を作る。一本道の中間ノードは
 * 飛び越えて、直近の意味のある祖先へつなぎ直す（明示スタックで走査）。
 * 合わせて、縮約後の各エッジに畳み込まれた元の編集回数（ホップ数）も記録する。
 */
function reduceChildren(
  rootNodeId: string,
  childrenMap: Record<string, string[]>,
  significant: Set<string>
): { children: Record<string, string[]>; editCounts: Map<string, number> } {
  const children: Record<string, string[]> = {};
  const editCounts = new Map<string, number>();
  const stack: Array<{ id: string; ancestor: string | null; hopsFromAncestor: number }> = [
    { id: rootNodeId, ancestor: null, hopsFromAncestor: 0 },
  ];
  while (stack.length > 0) {
    const { id, ancestor, hopsFromAncestor } = stack.pop()!;
    const isSig = significant.has(id);
    if (isSig && ancestor !== null) {
      (children[ancestor] ??= []).push(id);
      editCounts.set(`${ancestor}->${id}`, hopsFromAncestor);
    }
    const nextAncestor = isSig ? id : ancestor;
    const kids = childrenMap[id] ?? [];
    for (let i = kids.length - 1; i >= 0; i--) {
      const childHops = isSig ? 1 : hopsFromAncestor + 1;
      stack.push({ id: kids[i], ancestor: nextAncestor, hopsFromAncestor: childHops });
    }
  }
  return { children, editCounts };
}

/**
 * 再帰的なサブツリー幅配分（Reingold-Tilford系）で、縮約後の木のレイアウトを
 * 計算する。
 *   Pass 1（post-order）: 各ノードの subtreeWidth（葉=1、内部ノード=子の合計）を計算。
 *   Pass 2（pre-order）: 親の水平スパンを子の subtreeWidth 比で分割し、
 *     各子の x をその中点に割り当てる。深い履歴でスタックオーバーフローしないよう
 *     再帰ではなく明示スタックで走査する。
 * y は treeHeight を段数で正規化した (maxDepth - depth) / maxDepth * treeHeight
 * とし、root が最大y（画面下）、apex側ほど小さいy（画面上）になるようにする
 * （SVGはy軸下向きが正なので、これで「根が下、樹冠が上」という木の向きになる）。
 *
 * @param treeHeight 木全体の高さ（world単位）。呼び出し側が実際の表示領域
 *   （バブルの高さなど）を測って渡すことを想定し、既定値は {@link TREE_HEIGHT}。
 */
export function computeTreeLayout(
  graph: WorldLineGraph,
  treeHeight: number = TREE_HEIGHT
): TreeLayout {
  const { nodes, rootNodeId } = graph.state;
  if (!rootNodeId || !nodes[rootNodeId]) {
    return EMPTY_LAYOUT;
  }

  const childrenMap = graph.getChildrenMap();
  const significant = selectSignificantIds(graph, childrenMap);
  const { children: reduced, editCounts } = reduceChildren(rootNodeId, childrenMap, significant);

  // worldLineId ごとの色割り当て（WorldLinesCanvasView と同じ方式）
  const wlColors = new Map<string, string>();
  let colorIdx = 0;
  for (const node of Object.values(nodes)) {
    if (!wlColors.has(node.worldLineId)) {
      wlColors.set(node.worldLineId, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
      colorIdx++;
    }
  }

  // Pass 1: post-order で subtreeWidth を計算（縮約後の木に対して、明示スタック）
  const widthOf = new Map<string, number>();
  const postOrder: string[] = [];
  {
    const stack: Array<{ id: string; visited: boolean }> = [{ id: rootNodeId, visited: false }];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.visited) {
        stack.pop();
        postOrder.push(top.id);
        continue;
      }
      top.visited = true;
      const kids = reduced[top.id] ?? [];
      for (let i = kids.length - 1; i >= 0; i--) {
        stack.push({ id: kids[i], visited: false });
      }
    }
  }
  for (const id of postOrder) {
    const kids = reduced[id] ?? [];
    if (kids.length === 0) {
      widthOf.set(id, 1);
    } else {
      let sum = 0;
      for (const cid of kids) sum += widthOf.get(cid) ?? 1;
      widthOf.set(id, sum);
    }
  }

  // Pass 2: pre-order で x（水平スパンの中点）・depth を割り当て（明示スタック）
  type Frame = { id: string; depth: number; xStart: number; xEnd: number };
  const positions = new Map<string, { x: number; depth: number }>();
  const edges: TreeEdge[] = [];
  let maxDepth = 0;

  const rootWidth = widthOf.get(rootNodeId) ?? 1;
  const stack2: Frame[] = [{ id: rootNodeId, depth: 0, xStart: 0, xEnd: rootWidth * LEAF_DX }];
  while (stack2.length > 0) {
    const frame = stack2.pop()!;
    const { id, depth, xStart, xEnd } = frame;
    positions.set(id, { x: (xStart + xEnd) / 2, depth });
    if (depth > maxDepth) maxDepth = depth;

    const kids = reduced[id] ?? [];
    let cursor = xStart;
    for (const cid of kids) {
      edges.push({ from: id, to: cid, editCount: editCounts.get(`${id}->${cid}`) ?? 1 });
      const w = (widthOf.get(cid) ?? 1) * LEAF_DX;
      stack2.push({ id: cid, depth: depth + 1, xStart: cursor, xEnd: cursor + w });
      cursor += w;
    }
  }

  const resultNodes = new Map<string, TreeNodeLayout>();
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [id, pos] of positions) {
    const node = nodes[id];
    const isLeaf = (reduced[id]?.length ?? 0) === 0;
    const y = maxDepth === 0 ? 0 : (treeHeight * (maxDepth - pos.depth)) / maxDepth;
    resultNodes.set(id, {
      x: pos.x,
      y,
      depth: pos.depth,
      subtreeWidth: widthOf.get(id) ?? 1,
      isLeaf,
      color: wlColors.get(node.worldLineId) ?? '#888',
    });
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
  }

  return {
    nodes: resultNodes,
    edges,
    minX,
    maxX,
    maxY: maxDepth === 0 ? 0 : treeHeight,
  };
}
