"use client";
import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import type { WorldLineGraph } from "@bublys-org/world-line-graph";

/**
 * world-line グラフを canvas に「左→右、上→下に分岐していく木」として描画する純粋ビュー。
 *
 * 描画は graph.state / apexNodeId / getNodeSummary が変わったときだけ走る。
 * 同じ state なら canvas には何も書き直さない（pure function ライク）。
 */
export type WorldLinesCanvasViewProps = {
  graph: WorldLineGraph;
  apexNodeId: string | null;
  /** ノード ID → ラベル要約。省略時は空文字（描画なし）。memo 化推奨。 */
  getNodeSummary?: (nodeId: string) => string;
  /** ノードクリック時のハンドラ。 */
  onSelectNode: (nodeId: string) => void;
  /** 背景色（任意。デフォルト透明）。 */
  background?: string;
};

type NodePos = { x: number; y: number; color: string };
type Layout = {
  width: number;
  height: number;
  nodes: Map<string, NodePos>;
  edges: Array<{ from: string; to: string }>;
};

const NODE_RADIUS = 7;
const COL_DX = 44;
const ROW_DY = 28;
const PADDING = 18;
const COLOR_PALETTE = [
  "#5ec5ff",
  "#ffb05e",
  "#7ee787",
  "#ff6b9d",
  "#b58cff",
  "#ffe066",
  "#65d6c8",
  "#ff8a65",
];

function computeLayout(graph: WorldLineGraph): Layout {
  const { nodes, rootNodeId } = graph.state;
  if (!rootNodeId || !nodes[rootNodeId]) {
    return { width: PADDING * 2, height: PADDING * 2, nodes: new Map(), edges: [] };
  }

  const childrenMap = graph.getChildrenMap();

  // worldLineId → 色割り当て
  const wlColors = new Map<string, string>();
  let colorIdx = 0;
  for (const node of Object.values(nodes)) {
    if (!wlColors.has(node.worldLineId)) {
      wlColors.set(node.worldLineId, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
      colorIdx++;
    }
  }

  const positions = new Map<string, NodePos>();
  const edges: Array<{ from: string; to: string }> = [];
  let nextRow = 0;

  // DFS: 最初の子は親と同じ row、それ以降は新しい row を払い出して下に分岐させる。
  const visit = (nodeId: string, depth: number, row: number) => {
    const node = nodes[nodeId];
    if (!node || positions.has(nodeId)) return;
    positions.set(nodeId, {
      x: depth * COL_DX,
      y: row * ROW_DY,
      color: wlColors.get(node.worldLineId) ?? "#888",
    });
    const children = childrenMap[nodeId] ?? [];
    children.forEach((cid, i) => {
      edges.push({ from: nodeId, to: cid });
      const childRow = i === 0 ? row : ++nextRow;
      visit(cid, depth + 1, childRow);
    });
  };
  visit(rootNodeId, 0, 0);

  let maxX = 0;
  let maxY = 0;
  for (const pos of positions.values()) {
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  }

  return {
    width: maxX + (PADDING + NODE_RADIUS) * 2,
    height: maxY + (PADDING + NODE_RADIUS) * 2,
    nodes: positions,
    edges,
  };
}

function draw(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  apexNodeId: string | null,
  getSummary: (id: string) => string,
  cssWidth: number,
  cssHeight: number,
  background: string | undefined,
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }
  ctx.save();
  ctx.translate(PADDING + NODE_RADIUS, PADDING + NODE_RADIUS);

  // edges 先（ノードが上に来るように）
  ctx.lineWidth = 1.5;
  for (const edge of layout.edges) {
    const from = layout.nodes.get(edge.from);
    const to = layout.nodes.get(edge.to);
    if (!from || !to) continue;
    ctx.strokeStyle = to.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    if (from.y === to.y) {
      ctx.lineTo(to.x, to.y);
    } else {
      // L 字: 右に少し進んでから縦に降りて再度右に
      const midX = from.x + COL_DX * 0.5;
      ctx.lineTo(midX, from.y);
      ctx.lineTo(midX, to.y);
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ノード
  ctx.font = "11px ui-sans-serif, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  for (const [id, pos] of layout.nodes) {
    const isApex = id === apexNodeId;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isApex ? pos.color : "rgba(20,22,30,0.85)";
    ctx.fill();
    ctx.strokeStyle = pos.color;
    ctx.lineWidth = isApex ? 2.5 : 1.5;
    ctx.stroke();

    const summary = getSummary(id);
    if (summary) {
      ctx.fillStyle = "rgba(230,235,255,0.75)";
      ctx.textAlign = "left";
      ctx.fillText(summary, pos.x + NODE_RADIUS + 4, pos.y);
    }
  }

  ctx.restore();
}

export const WorldLinesCanvasView: FC<WorldLinesCanvasViewProps> = ({
  graph,
  apexNodeId,
  getNodeSummary,
  onSelectNode,
  background,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 同じ state なら layout 自体を再利用して描画もスキップする
  const layout = useMemo(() => computeLayout(graph), [graph.state]);
  const summarize = getNodeSummary ?? ((_: string) => "");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.ceil(layout.width * dpr));
    canvas.height = Math.max(1, Math.ceil(layout.height * dpr));
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, layout, apexNodeId, summarize, layout.width, layout.height, background);
  }, [layout, apexNodeId, summarize, background]);

  // 現在 apex の位置にスクロールして中央へ寄せる。
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !apexNodeId) return;
    const pos = layout.nodes.get(apexNodeId);
    if (!pos) return;
    const targetX = pos.x + PADDING + NODE_RADIUS;
    const targetY = pos.y + PADDING + NODE_RADIUS;
    container.scrollTo({
      left: Math.max(0, targetX - container.clientWidth / 2),
      top: Math.max(0, targetY - container.clientHeight / 2),
      behavior: "smooth",
    });
  }, [layout, apexNodeId]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - (PADDING + NODE_RADIUS);
      const y = e.clientY - rect.top - (PADDING + NODE_RADIUS);
      // 半径 1.8 倍を当たり判定にする
      const hitR2 = (NODE_RADIUS * 1.8) ** 2;
      for (const [id, pos] of layout.nodes) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy <= hitR2) {
          onSelectNode(id);
          return;
        }
      }
    },
    [layout, onSelectNode],
  );

  return (
    <div ref={scrollRef} style={{ overflow: "auto", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} onClick={handleClick} style={{ display: "block" }} />
    </div>
  );
};
