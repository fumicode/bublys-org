"use client";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorldLineGraph } from "@bublys-org/world-line-graph";

/**
 * world-line グラフを canvas に「左→右に流れ、分岐は下に伸びる木」として描く純粋ビュー。
 *
 * 設計ルール:
 *  - canvas は中身ではなく **コンテナ（＝バブル）が指定したサイズ** にぴったり張る。
 *    伸び縮みするのは「中の世界」であって canvas ではない。
 *  - スクロールはネイティブ overflow ではなく、canvas 上の wheel を自前で取得して
 *    フォーカス点（ビューポート中央に来る world 座標）を動かす。
 *  - 横（時間＝世代）方向にだけ魚眼レンズをかける: フォーカスに近い世代ほど大きく
 *    広く、遠い世代ほど細かく圧縮する。これで「画面に多く映しつつ近くは操作しやすい」。
 *  - 縦（分岐）方向は歪ませず等間隔。縦は素直にパンする。
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
  /** world 座標でのノード位置（0,0 起点） */
  nodes: Map<string, NodePos>;
  edges: Array<{ from: string; to: string }>;
  maxX: number;
  maxY: number;
};

// --- world 座標の間隔（魚眼前の素の間隔） ---
const COL_DX = 70; // 1 世代ぶんの横間隔
const ROW_DY = 40; // 1 分岐ぶんの縦間隔
const NODE_RADIUS = 9; // フォーカス位置（scale=1）でのノード半径
const MARGIN = 28; // ビューポート端の余白（魚眼の左右端がここに収まる）

// --- 魚眼パラメータ ---
const DISTORT = 4; // 大きいほど中心が強拡大される（Sarkar-Brown の歪み係数）
const MIN_SCALE = 0.32; // 最遠ノードのスケール
const FALLOFF_POW = 1.4; // スケール減衰カーブ
const LABEL_SCALE_THRESHOLD = 0.62; // これ未満のスケールではラベルを省略

// --- スクロール感度 ---
const SENS_X = 0.55; // wheel deltaX → focusX(world)
const SENS_Y = 1.0; // wheel deltaY → focusY(world)
const EASE = 0.22; // フォーカスのイージング係数（0..1）

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
    return { nodes: new Map(), edges: [], maxX: 0, maxY: 0 };
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

  return { nodes: positions, edges, maxX, maxY };
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * Sarkar-Brown 1D 魚眼変換。xn ∈ [-1,1] を [-1,1] に写像し、0 付近を拡大する。
 * 微分（拡大率）は中心で (d+1)、端で 1/(d+1)。
 */
function fisheye(xn: number, d: number): number {
  const a = Math.abs(xn);
  const denom = d * a + 1;
  return (Math.sign(xn) * (d + 1) * a) / denom;
}

/**
 * world 座標 → screen 座標 + ノードスケールを返す投影関数を作る。
 * 横はフォーカスを中心に魚眼、縦は等倍パン。draw と当たり判定で共有する。
 */
function makeProjector(
  layout: Layout,
  focusX: number,
  focusY: number,
  vw: number,
  vh: number,
) {
  const cx = vw / 2;
  const cy = vh / 2;
  const halfW = Math.max(1, vw / 2 - MARGIN);
  const leftSpan = focusX; // world 0 が左端
  const rightSpan = layout.maxX - focusX;

  return (worldX: number, worldY: number) => {
    let xn: number;
    if (worldX >= focusX) {
      xn = rightSpan > 0 ? (worldX - focusX) / rightSpan : 0;
    } else {
      xn = leftSpan > 0 ? (worldX - focusX) / leftSpan : 0;
    }
    const t = fisheye(xn, DISTORT);
    const sx = cx + halfW * t;
    const sy = cy + (worldY - focusY);
    const dist = Math.min(1, Math.abs(xn));
    const scale = MIN_SCALE + (1 - MIN_SCALE) * Math.pow(1 - dist, FALLOFF_POW);
    return { sx, sy, scale };
  };
}

function draw(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  project: ReturnType<typeof makeProjector>,
  apexNodeId: string | null,
  getSummary: (id: string) => string,
  vw: number,
  vh: number,
  background: string | undefined,
) {
  ctx.clearRect(0, 0, vw, vh);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, vw, vh);
  }

  const screen = new Map<string, { sx: number; sy: number; scale: number; color: string }>();
  for (const [id, pos] of layout.nodes) {
    const p = project(pos.x, pos.y);
    screen.set(id, { ...p, color: pos.color });
  }

  // edges（ノードより先に描いて下に敷く）
  for (const edge of layout.edges) {
    const from = screen.get(edge.from);
    const to = screen.get(edge.to);
    if (!from || !to) continue;
    ctx.strokeStyle = to.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1, 1.6 * to.scale);
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    if (Math.abs(from.sy - to.sy) < 0.5) {
      ctx.lineTo(to.sx, to.sy);
    } else {
      // L 字: 横に半分進んでから縦に降り、また横へ
      const midX = from.sx + (to.sx - from.sx) * 0.5;
      ctx.lineTo(midX, from.sy);
      ctx.lineTo(midX, to.sy);
      ctx.lineTo(to.sx, to.sy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ノード
  ctx.textBaseline = "middle";
  for (const [id, s] of screen) {
    if (s.sx < -40 || s.sx > vw + 40 || s.sy < -40 || s.sy > vh + 40) continue;
    const isApex = id === apexNodeId;
    const r = NODE_RADIUS * s.scale;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
    ctx.fillStyle = isApex ? s.color : "rgba(20,22,30,0.85)";
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = (isApex ? 2.6 : 1.6) * Math.max(0.6, s.scale);
    ctx.stroke();

    if (isApex) {
      // apex を二重リングで強調
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, r + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const summary = getSummary(id);
    if (summary && s.scale >= LABEL_SCALE_THRESHOLD) {
      ctx.fillStyle = "rgba(230,235,255,0.78)";
      ctx.textAlign = "left";
      ctx.font = `${Math.round(11 * s.scale)}px ui-sans-serif, -apple-system, sans-serif`;
      ctx.fillText(summary, s.sx + r + 4, s.sy);
    }
  }
}

export const WorldLinesCanvasView: FC<WorldLinesCanvasViewProps> = ({
  graph,
  apexNodeId,
  getNodeSummary,
  onSelectNode,
  background,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ w: 1, h: 1 });

  // 同じ state なら layout を再利用
  const layout = useMemo(() => computeLayout(graph), [graph.state]);
  const summarize = getNodeSummary ?? ((_: string) => "");

  // フォーカス（ビューポート中央に来る world 座標）。current を target へ追従させる。
  const focusRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const initializedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // 最新の描画依存を ref に逃がして wheel/rAF から参照する
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const apexRef = useRef(apexNodeId);
  apexRef.current = apexNodeId;
  const summarizeRef = useRef(summarize);
  summarizeRef.current = summarize;
  const backgroundRef = useRef(background);
  backgroundRef.current = background;

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = viewportRef.current;
    const project = makeProjector(
      layoutRef.current,
      focusRef.current.x,
      focusRef.current.y,
      w,
      h,
    );
    draw(ctx, layoutRef.current, project, apexRef.current, summarizeRef.current, w, h, backgroundRef.current);
  }, []);

  // current を target へイージングしながら描画するループ。落ち着いたら止まる。
  const tick = useCallback(() => {
    const f = focusRef.current;
    const t = targetRef.current;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
      f.x = t.x;
      f.y = t.y;
      renderFrame();
      rafRef.current = null;
      return;
    }
    f.x += dx * EASE;
    f.y += dy * EASE;
    renderFrame();
    rafRef.current = requestAnimationFrame(tick);
  }, [renderFrame]);

  const scheduleAnimate = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const setTarget = useCallback((x: number, y: number) => {
    const lay = layoutRef.current;
    targetRef.current = {
      x: clamp(x, 0, lay.maxX),
      y: clamp(y, 0, lay.maxY),
    };
    scheduleAnimate();
  }, [scheduleAnimate]);

  // コンテナサイズ追従（canvas はバブルが指定したサイズにぴったり張る）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setViewport({
        w: Math.max(1, el.clientWidth),
        h: Math.max(1, el.clientHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // viewport の物理ピクセル設定 + 即時再描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.ceil(viewport.w * dpr));
    canvas.height = Math.max(1, Math.ceil(viewport.h * dpr));
    canvas.style.width = `${viewport.w}px`;
    canvas.style.height = `${viewport.h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderFrame();
  }, [viewport, renderFrame]);

  // 初回フォーカス確定 + apex が変化したときだけそのノードへ寄せる。
  // （layout や summary だけの変化では寄せない＝スクロール位置を奪わない）
  const prevApexRef = useRef<string | null>(null);
  useEffect(() => {
    const apexPos = apexNodeId ? layout.nodes.get(apexNodeId) : null;
    if (!initializedRef.current) {
      const home = apexPos ?? (layout.nodes.values().next().value as NodePos | undefined) ?? null;
      if (home) {
        focusRef.current = { x: home.x, y: home.y };
        targetRef.current = { x: home.x, y: home.y };
        initializedRef.current = true;
        prevApexRef.current = apexNodeId;
      }
    } else if (apexNodeId !== prevApexRef.current && apexPos) {
      prevApexRef.current = apexNodeId;
      setTarget(apexPos.x, apexPos.y);
    }
    renderFrame();
  }, [layout, apexNodeId, setTarget, renderFrame]);

  // summary だけの変化（フォーカスは動かさず描画だけ更新）
  useEffect(() => {
    renderFrame();
  }, [summarize, renderFrame]);

  // 自前スクロール: wheel でフォーカスを動かす（横＝魚眼軸 / 縦＝パン）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const horizontalIntent = e.shiftKey ? e.deltaY : e.deltaX;
      const verticalIntent = e.shiftKey ? 0 : e.deltaY;
      const t = targetRef.current;
      setTarget(t.x + horizontalIntent * SENS_X, t.y + verticalIntent * SENS_Y);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setTarget]);

  // クリック当たり判定（魚眼後の screen 座標で最近傍ノードを拾う）
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { w, h } = viewportRef.current;
      const project = makeProjector(layoutRef.current, focusRef.current.x, focusRef.current.y, w, h);
      let bestId: string | null = null;
      let bestD2 = Infinity;
      for (const [id, pos] of layoutRef.current.nodes) {
        const { sx, sy, scale } = project(pos.x, pos.y);
        const hitR = NODE_RADIUS * scale * 1.8;
        const dx = px - sx;
        const dy = py - sy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= hitR * hitR && d2 < bestD2) {
          bestD2 = d2;
          bestId = id;
        }
      }
      if (bestId) onSelectNode(bestId);
    },
    [onSelectNode],
  );

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ display: "block", cursor: "pointer" }}
      />
    </div>
  );
};
