import { TreeLayout, TreeNodeLayout, TreeEdge } from './treeLayout.js';

/**
 * `computeTreeLayout` が出す縮約木の座標（x/y/depth/subtreeWidth/editCount/isLeaf/color）は
 * 一切変えず、そこから「本物の木らしい」見た目のための描画用ジオメトリとアニメーション
 * スケジュールを計算する、React/DOM に依存しない純粋関数群。
 *
 * ランダム性はノード/エッジIDから決定的にシードする（Math.random() は使わない）——
 * 同じグラフ状態なら再レンダリングしても同じ枝の揺れ方になることを保証するため。
 */

// ============================================================================
// 決定的PRNG（ノード/エッジIDからシード）
// ============================================================================

/** 文字列 → 32bit符号なし整数のFNV-1a風ハッシュ。シード生成専用の軽量版（domain/StateHash.ts の64bit版とは別実装、結合度を上げないため）。 */
function hashStringToSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — 同じシードなら常に同じ数列を返す小さな決定的PRNG。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(seedKey: string): () => number {
  return mulberry32(hashStringToSeed(seedKey));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================================================
// 型
// ============================================================================

export type OrganicPetal = {
  readonly dx: number;
  readonly dy: number;
  readonly r: number;
};

export type OrganicEdge = {
  readonly from: string;
  readonly to: string;
  /** ジッターの効いたベジェの中心線（stroke-dasharray で「伸びる」動きに使う）。 */
  readonly centerlinePath: string;
  /** 太さがテーパーする塗りの輪郭（帯ポリゴン、閉じたパス）。 */
  readonly outlinePath: string;
  /** サンプル点の弧長近似。stroke-dasharray の長さに使う。 */
  readonly approxLength: number;
  /** from側の太さ。 */
  readonly widthFrom: number;
  /** to側の太さ（widthFrom * taperRatio、子に向かって細くなる）。 */
  readonly widthTo: number;
  /** worldLineId に関わらず統一された、木らしい幹の色（軽い濃淡ゆらぎ付き）。 */
  readonly barkColor: string;
  readonly delayMs: number;
  readonly durationMs: number;
};

export type OrganicLeaf = {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  /** 既存の worldLineId 由来色。どの世界線の実りかを示すのはここだけに残す。 */
  readonly color: string;
  readonly petals: readonly OrganicPetal[];
  readonly revealAtMs: number;
};

export type OrganicApex = {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly revealAtMs: number;
};

export type OrganicTree = {
  readonly edges: readonly OrganicEdge[];
  readonly leaves: readonly OrganicLeaf[];
  readonly apex: OrganicApex | null;
  readonly totalDurationMs: number;
};

export type OrganicTreeOptions = {
  /** 成長アニメーション全体の所要時間（ms）。エッジ数に関わらずこの時間で必ず完了する。 */
  readonly totalDurationMs: number;
  /** 1本の枝が伸びるアニメーションの所要時間（ms、固定）。 */
  readonly edgeDurationMs: number;
  /** to側の太さ = from側の太さ * taperRatio。 */
  readonly taperRatio: number;
  /** ウォブル（揺れ）の振幅。エッジ長に対する比率。 */
  readonly wobbleAmplitudeRatio: number;
};

export const DEFAULT_ORGANIC_TREE_OPTIONS: OrganicTreeOptions = {
  totalDurationMs: 1800,
  edgeDurationMs: 420,
  taperRatio: 0.6,
  wobbleAmplitudeRatio: 0.06,
};

const EDGE_BASE_WIDTH = 1.2;
const SAMPLE_STEPS = 10;

// ============================================================================
// 幾何計算のヘルパー
// ============================================================================

type Point = { x: number; y: number };

function quadraticPoint(p0: Point, cp: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y,
  };
}

function quadraticTangent(p0: Point, cp: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: 2 * mt * (cp.x - p0.x) + 2 * t * (p1.x - cp.x),
    y: 2 * mt * (cp.y - p0.y) + 2 * t * (p1.y - cp.y),
  };
}

/**
 * 点列を通る滑らかなパス（各点を制御点、隣接点との中点を通過点にする定番のテクニック）。
 * 始点・終点は必ず points[0] / points[last] を正確に通る——ノード中心への正確な接続を保つため。
 * `skipMoveTo` は既にペンが points[0] にある続きのパス片として連結する場合に使う。
 */
function smoothPathCommands(points: readonly Point[], skipMoveTo = false): string {
  if (points.length === 0) return '';
  if (points.length === 1) return skipMoveTo ? '' : `M ${points[0].x} ${points[0].y}`;
  let d = skipMoveTo ? '' : `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cur = points[i];
    const next = points[i + 1];
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    d += ` Q ${cur.x} ${cur.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** worldLineId に関わらず統一された、木らしい幹の色。濃淡だけエッジごとにゆらす。 */
function barkColorFor(rng: () => number): string {
  const lightness = 26 + Math.round(rng() * 14); // 26–40%
  return `hsl(28, 32%, ${lightness}%)`;
}

function buildOrganicEdge(
  edge: TreeEdge,
  from: TreeNodeLayout,
  to: TreeNodeLayout,
  options: OrganicTreeOptions,
  timing: { delayMs: number; durationMs: number }
): OrganicEdge {
  const rng = rngFor(`${edge.from}->${edge.to}`);

  // 既存の15%/75%固定制御点の代わりに、範囲内でランダム化した制御点を使う。
  const cpxFrac = lerp(0.08, 0.3, rng());
  const cpyFrac = lerp(0.55, 0.85, rng());
  const cp: Point = {
    x: from.x + (to.x - from.x) * cpxFrac,
    y: from.y + (to.y - from.y) * cpyFrac,
  };

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const edgeLength = Math.hypot(dx, dy) || 1;
  const amplitude = options.wobbleAmplitudeRatio * edgeLength;
  const freq = 1 + Math.floor(rng() * 2); // 1〜2周期
  const phase = rng() * Math.PI * 2;

  // 既存の太さの式（subtreeWidth・editCount）をそのまま再利用し、to側だけテーパーさせる。
  const widthFactor = 1 + Math.log2(1 + to.subtreeWidth) * 0.8 + Math.log2(1 + edge.editCount) * 0.6;
  const widthFrom = EDGE_BASE_WIDTH * widthFactor;
  const widthTo = widthFrom * options.taperRatio;

  const centerPts: Point[] = [];
  const leftPts: Point[] = [];
  const rightPts: Point[] = [];
  let approxLength = 0;
  let prev: Point | null = null;

  for (let i = 0; i <= SAMPLE_STEPS; i++) {
    const t = i / SAMPLE_STEPS;
    const base = quadraticPoint(from, cp, to, t);
    const tangent = quadraticTangent(from, cp, to, t);
    const tLen = Math.hypot(tangent.x, tangent.y) || 1;
    const nx = -tangent.y / tLen;
    const ny = tangent.x / tLen;

    // 両端でゼロに収束する taper で、ノード中心への接続を崩さずに揺らす。
    const taper = Math.sin(Math.PI * t);
    const wobble = amplitude * Math.sin(freq * t * Math.PI * 2 + phase) * taper;
    const point: Point = { x: base.x + nx * wobble, y: base.y + ny * wobble };
    centerPts.push(point);

    const halfW = lerp(widthFrom, widthTo, t) / 2;
    leftPts.push({ x: point.x + nx * halfW, y: point.y + ny * halfW });
    rightPts.push({ x: point.x - nx * halfW, y: point.y - ny * halfW });

    if (prev) approxLength += Math.hypot(point.x - prev.x, point.y - prev.y);
    prev = point;
  }

  const centerlinePath = smoothPathCommands(centerPts);
  const rightReversed = [...rightPts].reverse();
  const capToRight = rightPts[rightPts.length - 1];
  const outlinePath =
    smoothPathCommands(leftPts) +
    ` L ${capToRight.x} ${capToRight.y}` +
    smoothPathCommands(rightReversed, true) +
    ' Z';

  return {
    from: edge.from,
    to: edge.to,
    centerlinePath,
    outlinePath,
    approxLength,
    widthFrom,
    widthTo,
    barkColor: barkColorFor(rng),
    delayMs: timing.delayMs,
    durationMs: timing.durationMs,
  };
}

/** ノードIDでシードした、葉ごとに安定した花/実の飾り（3〜5個）。「達成」の視覚的マーカー。 */
function computeLeafBloom(nodeId: string): OrganicPetal[] {
  const rng = rngFor(`leaf:${nodeId}`);
  const count = 3 + Math.floor(rng() * 3); // 3〜5個
  const petals: OrganicPetal[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.6;
    const dist = 4 + rng() * 5;
    const r = 1.5 + rng() * 2;
    petals.push({ dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, r });
  }
  return petals;
}

/**
 * エッジを「to側のtimestamp」昇順（grow() は常に現在のapexから伸びるため、子のtimestampは
 * 親以上——これで実際に育った順を再現できる）でランク付けし、本数に関わらず
 * totalDurationMs で必ず完了するようにディレイを割り当てる。
 */
function computeSchedule(
  edges: readonly TreeEdge[],
  nodeTimestamps: ReadonlyMap<string, number>,
  options: OrganicTreeOptions
): Map<string, { delayMs: number; durationMs: number }> {
  const ranked = [...edges].sort((a, b) => {
    const ta = nodeTimestamps.get(a.to) ?? 0;
    const tb = nodeTimestamps.get(b.to) ?? 0;
    if (ta !== tb) return ta - tb;
    return a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
  });
  const n = ranked.length;
  const span = Math.max(0, options.totalDurationMs - options.edgeDurationMs);
  const schedule = new Map<string, { delayMs: number; durationMs: number }>();
  ranked.forEach((edge, i) => {
    const rank = n <= 1 ? 0 : i / (n - 1);
    schedule.set(`${edge.from}->${edge.to}`, { delayMs: rank * span, durationMs: options.edgeDurationMs });
  });
  return schedule;
}

// ============================================================================
// エントリポイント
// ============================================================================

export function computeOrganicTree(
  layout: TreeLayout,
  apexNodeId: string | null,
  nodeTimestamps: ReadonlyMap<string, number>,
  options?: Partial<OrganicTreeOptions>
): OrganicTree {
  const opts: OrganicTreeOptions = { ...DEFAULT_ORGANIC_TREE_OPTIONS, ...options };

  if (layout.nodes.size === 0) {
    return { edges: [], leaves: [], apex: null, totalDurationMs: opts.totalDurationMs };
  }

  const schedule = computeSchedule(layout.edges, nodeTimestamps, opts);

  const edges: OrganicEdge[] = [];
  const revealAtByNode = new Map<string, number>();
  for (const edge of layout.edges) {
    const from = layout.nodes.get(edge.from);
    const to = layout.nodes.get(edge.to);
    const timing = schedule.get(`${edge.from}->${edge.to}`);
    if (!from || !to || !timing) continue;
    edges.push(buildOrganicEdge(edge, from, to, opts, timing));
    revealAtByNode.set(edge.to, timing.delayMs + timing.durationMs);
  }

  const leaves: OrganicLeaf[] = [];
  for (const [nodeId, node] of layout.nodes) {
    if (!node.isLeaf) continue;
    leaves.push({
      nodeId,
      x: node.x,
      y: node.y,
      color: node.color,
      petals: computeLeafBloom(nodeId),
      revealAtMs: revealAtByNode.get(nodeId) ?? 0,
    });
  }

  let apex: OrganicApex | null = null;
  const apexNode = apexNodeId ? layout.nodes.get(apexNodeId) : undefined;
  if (apexNodeId && apexNode) {
    apex = {
      nodeId: apexNodeId,
      x: apexNode.x,
      y: apexNode.y,
      color: apexNode.color,
      revealAtMs: revealAtByNode.get(apexNodeId) ?? 0,
    };
  }

  return { edges, leaves, apex, totalDurationMs: opts.totalDurationMs };
}
