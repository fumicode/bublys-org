"use client";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorldLineGraph } from "@bublys-org/world-line-graph";
import type { WorldLinesCanvasViewProps } from "@bublys-org/bubbles-ui";

/**
 * ClimberWorldLineCanvasView — 勤務表ローカル世界線の「木登り」ビュー（ホテル専用）。
 *
 * 共通の {@link WorldLinesCanvasView} を下→上に立てた縦向き版。時間（世代）は
 * **下から上へ** 流れ、根（最初の状態）が地面、apex（今いる世界）が木のてっぺん近くに
 * 来る。分岐は横に枝を伸ばす。apex には木をよじ登るクライマー（人型）を描く。
 *
 * 設計ルール（共通版から引き継ぐ）:
 *  - canvas は中身ではなく **コンテナ（＝バブル）が指定したサイズ** にぴったり張る。
 *  - スクロールはネイティブ overflow ではなく wheel を自前で取得してフォーカス点を動かす。
 *  - 縦（時間＝世代）方向にだけ魚眼レンズをかける: フォーカス（apex）に近い世代ほど
 *    大きく広く、遠い世代ほど圧縮する。横（分岐）方向は歪ませず等間隔にパンする。
 *
 * props は共通版と同一（{@link WorldLinesCanvasViewProps}）なので差し替え可能。
 */

type NodePos = { x: number; y: number; color: string };
type Layout = {
  /** world 座標でのノード位置（0,0 起点。x=分岐, y=世代） */
  nodes: Map<string, NodePos>;
  edges: Array<{ from: string; to: string }>;
  rootId: string | null;
  maxX: number;
  maxY: number;
};

// --- world 座標の間隔（魚眼前の素の間隔） ---
const BRANCH_DX = 74; // 1 分岐ぶんの横間隔（パン軸）
const GEN_DY = 40; // 1 世代ぶんの縦間隔（時間軸・魚眼前）
const NODE_RADIUS = 9; // フォーカス位置（scale=1）でのノード半径
const MARGIN = 34; // ビューポート端の余白（魚眼の上下端がここに収まる）

// --- 魚眼パラメータ（縦＝時間軸にかける） ---
// apex(フォーカス)近傍での「1 世代あたりのスクリーン間隔(px)」。これを固定値にするのが肝。
// 世界線がどれだけ長くても apex 付近の間隔はこの値に保たれ、圧縮は遠方（上下端）へ寄る。
const GEN_PX = 60;
const MIN_SCALE = 0.34; // 最遠ノードのスケール
const FALLOFF_POW = 1.4; // スケール減衰カーブ
const LABEL_BUBBLE_SCALE_THRESHOLD = 0.4; // これ未満のスケールでは名前の吹き出しを省略

// --- スクロール感度 ---
const SENS_X = 0.6; // wheel → focusX(world 分岐＝パン軸)
const SENS_Y = 0.7; // wheel → focusY(world 世代＝時間軸)
const EASE = 0.22; // フォーカスのイージング係数（0..1）

// クライマー（人型）の色。どの枝色の上でも人だと分かる暖色。
const CLIMBER_COLOR = "#ff9f45";

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
    return { nodes: new Map(), edges: [], rootId: null, maxX: 0, maxY: 0 };
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
  let nextBranch = 0;

  // DFS: 最初の子は親と同じ枝（branch）、それ以降は新しい枝を払い出して横に伸ばす。
  // depth（世代）は上へ積む＝縦軸。
  const visit = (nodeId: string, depth: number, branch: number) => {
    const node = nodes[nodeId];
    if (!node || positions.has(nodeId)) return;
    positions.set(nodeId, {
      x: branch * BRANCH_DX,
      y: depth * GEN_DY,
      color: wlColors.get(node.worldLineId) ?? "#888",
    });
    const children = childrenMap[nodeId] ?? [];
    children.forEach((cid, i) => {
      edges.push({ from: nodeId, to: cid });
      const childBranch = i === 0 ? branch : ++nextBranch;
      visit(cid, depth + 1, childBranch);
    });
  };
  visit(rootNodeId, 0, 0);

  let maxX = 0;
  let maxY = 0;
  for (const pos of positions.values()) {
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  }

  return { nodes: positions, edges, rootId: rootNodeId, maxX, maxY };
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * world 座標 → screen 座標 + ノードスケールを返す投影関数を作る。
 * 縦（時間＝世代）はフォーカス(apex)を中心に魚眼、横（分岐）は等倍パン。
 *
 * 縦は「apex 近傍は世代あたり GEN_PX の固定間隔、遠方は tanh で halfH に飽和」する形。
 * 未来（子・世代が大きい方）が **上**、過去（親・根）が **下** に来るよう符号を反転する。
 */
function makeProjector(
  focusX: number,
  focusY: number,
  vw: number,
  vh: number,
) {
  const cx = vw / 2;
  const cy = vh / 2;
  const halfH = Math.max(1, vh / 2 - MARGIN);

  // 中心の拡大率: 1 世代(GEN_DY) が GEN_PX になるよう固定（フォーカス位置に依存しない）。
  const mag0 = GEN_PX / GEN_DY; // screen px / world unit
  // tanh の特性長（world unit）。slope(0)=halfH/k=mag0 となるよう決める。
  const k = halfH / mag0;

  return (worldX: number, worldY: number) => {
    const u = worldY - focusY; // apex からの符号付き距離（+ = 未来 = 上）
    const sOff = halfH * Math.tanh(u / k); // ±halfH に飽和
    const sx = cx + (worldX - focusX); // 分岐: 等倍パン（横）
    const sy = cy - sOff; // 未来ほど上（sy を小さく）
    // スケールは端へ近づくほど（飽和率が高いほど）小さく
    const frac = Math.min(1, Math.abs(sOff) / halfH);
    const scale = MIN_SCALE + (1 - MIN_SCALE) * Math.pow(1 - frac, FALLOFF_POW);
    return { sx, sy, scale };
  };
}

/** apex の位置に木をよじ登るクライマー（人型）を描く。scale で大小、color は差し色。 */
function drawClimber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  gripColor: string,
) {
  const s = 16 * Math.max(0.55, scale); // 全体サイズ

  // 掴んでいる「ホールド」＝ apex ノードの小さな点（枝色）。
  ctx.beginPath();
  ctx.arc(x, y, NODE_RADIUS * scale * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = gripColor;
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = CLIMBER_COLOR;
  ctx.fillStyle = CLIMBER_COLOR;
  ctx.lineWidth = Math.max(1.5, 2.4 * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const headR = s * 0.22;
  const headY = y - s * 0.64;
  const shoulderY = y - s * 0.3;
  const hipY = y + s * 0.2;

  // 胴
  ctx.beginPath();
  ctx.moveTo(x, shoulderY);
  ctx.lineTo(x, hipY);
  ctx.stroke();

  // 頭
  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 腕（上へ伸ばして枝を掴む。左右で高さを変えて登る動作に）
  ctx.beginPath();
  ctx.moveTo(x, shoulderY);
  ctx.lineTo(x - s * 0.44, y - s * 0.98); // 左腕（高く）
  ctx.moveTo(x, shoulderY);
  ctx.lineTo(x + s * 0.42, y - s * 0.72); // 右腕（やや低く）
  ctx.stroke();

  // 脚（膝を曲げて幹を挟む登りポーズ）
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(x - s * 0.32, y + s * 0.56);
  ctx.lineTo(x - s * 0.46, y + s * 0.94); // 左脚
  ctx.moveTo(x, hipY);
  ctx.lineTo(x + s * 0.36, y + s * 0.5);
  ctx.lineTo(x + s * 0.3, y + s * 0.96); // 右脚
  ctx.stroke();

  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  project: ReturnType<typeof makeProjector>,
  apexNodeId: string | null,
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

  const screen = new Map<
    string,
    { sx: number; sy: number; scale: number; color: string }
  >();
  for (const [id, pos] of layout.nodes) {
    const p = project(pos.x, pos.y);
    screen.set(id, { ...p, color: pos.color });
  }

  // edges（ノードより先に描いて下に敷く）。幹は縦、分岐は横に枝分かれ。
  for (const edge of layout.edges) {
    const from = screen.get(edge.from); // 親（下・過去）
    const to = screen.get(edge.to); // 子（上・未来）
    if (!from || !to) continue;
    ctx.strokeStyle = to.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1, 1.8 * to.scale);
    ctx.beginPath();
    ctx.moveTo(from.sx, from.sy);
    if (Math.abs(from.sx - to.sx) < 0.5) {
      // 同じ枝: まっすぐ縦（幹）
      ctx.lineTo(to.sx, to.sy);
    } else {
      // L 字: 縦に半分登ってから横へ枝を伸ばし、また縦へ
      const midY = from.sy + (to.sy - from.sy) * 0.5;
      ctx.lineTo(from.sx, midY);
      ctx.lineTo(to.sx, midY);
      ctx.lineTo(to.sx, to.sy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 根（地面）: root ノードの下に短い根を数本描いて「木」を強調する。
  if (layout.rootId) {
    const root = screen.get(layout.rootId);
    if (root) {
      const rl = 9 * root.scale;
      ctx.strokeStyle = root.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, 1.6 * root.scale);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(root.sx, root.sy);
      ctx.lineTo(root.sx - rl, root.sy + rl);
      ctx.moveTo(root.sx, root.sy);
      ctx.lineTo(root.sx, root.sy + rl * 1.2);
      ctx.moveTo(root.sx, root.sy);
      ctx.lineTo(root.sx + rl, root.sy + rl);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ノード
  ctx.textBaseline = "middle";
  for (const [id, s] of screen) {
    if (s.sx < -40 || s.sx > vw + 40 || s.sy < -40 || s.sy > vh + 40) continue;
    const isApex = id === apexNodeId;
    const r = NODE_RADIUS * s.scale;

    if (!isApex) {
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,22,30,0.85)";
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6 * Math.max(0.6, s.scale);
      ctx.stroke();
    }
    // apex はノードの代わりにクライマーを（他ノードの上に載るよう）後段でまとめて描く。
  }

  // apex のクライマーを最後に描いて他ノードに隠れないようにする。
  if (apexNodeId) {
    const a = screen.get(apexNodeId);
    if (a && a.sx >= -40 && a.sx <= vw + 40 && a.sy >= -40 && a.sy <= vh + 40) {
      drawClimber(ctx, a.sx, a.sy, a.scale, a.color);
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
    // apex はクライマーが上に伸びるので、名前は右側に置いて重なりを避ける。
    const isApex = id === apexNodeId;
    let bx: number;
    let by: number;
    let tailFrom: "bottom" | "left";
    if (isApex) {
      bx = s.sx + r + 10;
      by = s.sy - bh / 2;
      tailFrom = "left";
    } else {
      bx = s.sx - bw / 2;
      by = s.sy - r - 4 - tail - bh; // ノードの上
      tailFrom = "bottom";
    }

    // 吹き出し本体（角丸）
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 5);
    ctx.fillStyle = "rgba(250,250,255,0.96)";
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 尻尾（ノードを指す）
    ctx.beginPath();
    if (tailFrom === "bottom") {
      ctx.moveTo(s.sx - 4, by + bh);
      ctx.lineTo(s.sx + 4, by + bh);
      ctx.lineTo(s.sx, by + bh + tail);
    } else {
      ctx.moveTo(bx, s.sy - 4);
      ctx.lineTo(bx, s.sy + 4);
      ctx.lineTo(bx - tail, s.sy);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(250,250,255,0.96)";
    ctx.fill();

    // テキスト
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.fillText(label, bx + bw / 2, by + bh / 2);
  }
}

type ClimberWorldLineCanvasViewProps = WorldLinesCanvasViewProps;

export const ClimberWorldLineCanvasView: FC<ClimberWorldLineCanvasViewProps> = ({
  graph,
  apexNodeId,
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
    const project = makeProjector(focusRef.current.x, focusRef.current.y, w, h);
    draw(ctx, layoutRef.current, project, apexRef.current, labelizeRef.current, w, h, backgroundRef.current);

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

  // label だけの変化（フォーカスは動かさず描画だけ更新）
  useEffect(() => {
    renderFrame();
  }, [labelize, renderFrame]);

  // 自前スクロール: wheel でフォーカスを動かす（縦＝時間軸／横＝分岐パン）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // 背景（universe viewport）の wheel パンへ伝播させない。
      e.stopPropagation();
      const branchIntent = e.shiftKey ? e.deltaY : e.deltaX; // 横＝分岐パン
      const timeIntent = e.shiftKey ? 0 : e.deltaY; // 縦＝時間軸
      const t = targetRef.current;
      // 下スクロール(deltaY>0)で過去（下）へ潜る＝focusY を減らす。
      setTarget(t.x + branchIntent * SENS_X, t.y - timeIntent * SENS_Y);
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
      const { w, h } = viewportRef.current;
      // getBoundingClientRect は CSS transform 後の実寸を返すので、表示スケールで割り戻す。
      const fx = rect.width / w || 1;
      const fy = rect.height / h || 1;
      const px = (e.clientX - rect.left) / fx;
      const py = (e.clientY - rect.top) / fy;
      const project = makeProjector(focusRef.current.x, focusRef.current.y, w, h);
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
