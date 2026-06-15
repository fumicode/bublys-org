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
  /** ノード ID → 状態要約（手数・バブル数など）。ノード脇に小さく描く。 */
  getNodeSummary?: (nodeId: string) => string;
  /** ノード ID → ユーザーがつけた名前（ラベル）。あればノード上に吹き出しで描く。 */
  getNodeLabel?: (nodeId: string) => string;
  /** ノードクリック時のハンドラ。 */
  onSelectNode: (nodeId: string) => void;
  /**
   * apex ノードの画面座標（CSS px, canvas 左上基準）を毎フレーム通知する。
   * apex が無い/画面外のときは null。ラベル入力欄をノード近くに寄せる用途。
   */
  onApexScreenPos?: (pos: { x: number; y: number } | null) => void;
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
const REF_FLOOR = COL_DX * 4; // 正規化基準の下限（過去がこれより短い間は引き伸ばさない）
const MIN_SCALE = 0.32; // 最遠ノードのスケール
const FALLOFF_POW = 1.4; // スケール減衰カーブ
const LABEL_SCALE_THRESHOLD = 0.62; // これ未満のスケールでは状態要約を省略
const LABEL_BUBBLE_SCALE_THRESHOLD = 0.4; // これ未満のスケールでは名前の吹き出しを省略

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

  // 正規化の基準は「フォーカス→root（過去）までの距離」一本。左右共通で使う。
  // - 過去側: worldX=0(root) で xn=-1 となり必ず左端に届く（root を左端に固定）。
  // - 未来側: 同じ縮尺。newest は xn が 1 になるとは限らず、右端には貼り付かない
  //   （短ければ右に余白、長ければ |xn|>1 で右端の外へ＝スクロールで辿る）。
  // 過去がまだ短いうちは引き伸ばさないよう下限 REF_FLOOR を設ける。
  const ref = Math.max(focusX, REF_FLOOR);

  return (worldX: number, worldY: number) => {
    const xn = (worldX - focusX) / ref;
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
  getLabel: (id: string) => string,
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

  // ラベル（ユーザーがつけた名前）はノードの上に吹き出しで。要約とは別レイヤーで
  // 最後に描いて他ノードに隠れないようにする。
  ctx.textBaseline = "middle";
  for (const [id, s] of screen) {
    if (s.sx < -60 || s.sx > vw + 60 || s.sy < -60 || s.sy > vh + 60) continue;
    if (s.scale < LABEL_BUBBLE_SCALE_THRESHOLD) continue;
    const label = getLabel(id);
    if (!label) continue;

    const r = NODE_RADIUS * s.scale;
    const fontSize = Math.max(10, Math.round(11 * s.scale));
    ctx.font = `${fontSize}px ui-sans-serif, -apple-system, sans-serif`;
    const padX = 6;
    const padY = 3;
    const tw = ctx.measureText(label).width;
    const bw = tw + padX * 2;
    const bh = fontSize + padY * 2;
    const tail = 5;
    const bx = s.sx - bw / 2;
    const by = s.sy - r - 4 - tail - bh; // ノードの上

    // 吹き出し本体（角丸）
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 5);
    ctx.fillStyle = "rgba(250,250,255,0.96)";
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 下向きの尻尾（ノードを指す）
    ctx.beginPath();
    ctx.moveTo(s.sx - 4, by + bh);
    ctx.lineTo(s.sx + 4, by + bh);
    ctx.lineTo(s.sx, by + bh + tail);
    ctx.closePath();
    ctx.fillStyle = "rgba(250,250,255,0.96)";
    ctx.fill();

    // テキスト
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.fillText(label, s.sx, by + bh / 2);
  }
}

export const WorldLinesCanvasView: FC<WorldLinesCanvasViewProps> = ({
  graph,
  apexNodeId,
  getNodeSummary,
  getNodeLabel,
  onSelectNode,
  onApexScreenPos,
  background,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ w: 1, h: 1 });

  // 同じ state なら layout を再利用
  const layout = useMemo(() => computeLayout(graph), [graph.state]);
  const summarize = getNodeSummary ?? ((_: string) => "");
  const labelize = getNodeLabel ?? ((_: string) => "");

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
  const labelizeRef = useRef(labelize);
  labelizeRef.current = labelize;
  const backgroundRef = useRef(background);
  backgroundRef.current = background;
  const onApexScreenPosRef = useRef(onApexScreenPos);
  onApexScreenPosRef.current = onApexScreenPos;

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
    draw(ctx, layoutRef.current, project, apexRef.current, summarizeRef.current, labelizeRef.current, w, h, backgroundRef.current);

    // apex の画面座標を通知（ラベル入力欄をノード近くに置く用途）
    const cb = onApexScreenPosRef.current;
    if (cb) {
      const apexId = apexRef.current;
      const apexNode = apexId ? layoutRef.current.nodes.get(apexId) : null;
      if (apexNode) {
        const p = project(apexNode.x, apexNode.y);
        const inView = p.sx >= -20 && p.sx <= w + 20 && p.sy >= -20 && p.sy <= h + 20;
        cb(inView ? { x: p.sx, y: p.sy } : null);
      } else {
        cb(null);
      }
    }
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

  // summary / label だけの変化（フォーカスは動かさず描画だけ更新）
  useEffect(() => {
    renderFrame();
  }, [summarize, labelize, renderFrame]);

  // 自前スクロール: wheel でフォーカスを動かす（横＝魚眼軸 / 縦＝パン）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // 背景（universe viewport）の wheel パンへ伝播させない。
      // これがないと canvas 上のスクロールで後ろのバブル空間も一緒に動く。
      e.stopPropagation();
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
