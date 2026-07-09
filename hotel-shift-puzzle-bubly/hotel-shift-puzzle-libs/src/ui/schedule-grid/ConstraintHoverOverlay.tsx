import { FC, RefObject, useLayoutEffect, useState } from "react";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";

/** ホバー中セルの人が属する1責任者ルール分の関係（勤務帯→全メンバー）。 */
export type ConstraintHoverGroup = {
  /** 担当勤務帯の id（色に使う。未解決なら既定色）。 */
  shiftId?: string;
  /** 担当勤務帯の表示名（起点ノードのラベル。例: 早番）。 */
  shiftName: string;
  /** ルールの全メンバー（表示中の人だけ。本人も含む）。 */
  memberIds: string[];
  /** その日にルールが満たされているか（✅/⚠️ の切り替え）。 */
  satisfied: boolean;
};

type Props = {
  /** グリッド本体（.e-grid）。セル座標の測定と、重ねる SVG の基準にする。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** ホバー中の日（列）の key。 */
  dayKey: string;
  /** ホバー中セルの人が属する責任者ルール群。 */
  groups: ConstraintHoverGroup[];
};

type Ribbon = { d: string; color: string };
type Node = {
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  fg: string;
  label: string;
  icon: string;
};
type Geom = { w: number; h: number; ribbons: Ribbon[]; nodes: Node[] };

const DEFAULT_FG = "#607d8b";
const DEFAULT_BG = "#eceff1";
const RIBBON_W = 7; // リボン（面）の太さ
const NODE_GAP = 40; // 列の右端から勤務帯ノードまでの距離
const NODE_H = 22;
const RULE_STRIDE = 104; // 複数ルールのときノードを右へずらす量

/** 太さ RIBBON_W の半透明リボン（面）のパスを作る。start（セル右端）→ node（勤務帯）を結ぶ。 */
const ribbonPath = (
  sx: number,
  sy: number,
  nx: number,
  ny: number
): string => {
  const half = RIBBON_W / 2;
  const c1x = sx + (nx - sx) * 0.45;
  const c2x = nx - (nx - sx) * 0.25;
  // 上辺（セル右端 → ノード）を C 曲線で、下辺を逆向きに戻して閉じる＝帯状の面。
  return (
    `M ${sx} ${sy - half} ` +
    `C ${c1x} ${sy - half}, ${c2x} ${ny - half}, ${nx} ${ny - half} ` +
    `L ${nx} ${ny + half} ` +
    `C ${c2x} ${ny + half}, ${c1x} ${sy + half}, ${sx} ${sy + half} Z`
  );
};

/**
 * 勤務表グリッドにホバー中だけ重なる、責任者制約の関係オーバーレイ。
 *
 * ルールビューと同じ「勤務帯（早番など）から候補者みんなへ」の構造を、表の中にコンパクトに描く。
 * ホバー中の日の列で、担当勤務帯のノードを列の右に置き、そこから各メンバーのセル右端へ
 * 半透明の面（リボン）を等しく伸ばす。ノードには ✅/⚠️ でその日の充足/未充足を出す。
 *
 * セルは一切隠さない：リボンはセルの右端から外側（列の右の余白）へ出る。座標は各セルの
 * offsetLeft/Top（.e-grid 基準の content 座標）で測るので、行展開やスクロールでもズレない。
 */
export const ConstraintHoverOverlay: FC<Props> = ({ gridRef, dayKey, groups }) => {
  const [geom, setGeom] = useState<Geom | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      setGeom(null);
      return;
    }
    // セルの「右端・上下中央」の座標を返す。
    const edgeOf = (staffId: string) => {
      const el = grid.querySelector<HTMLElement>(
        `[data-cell-key="${staffId}:${dayKey}"]`
      );
      if (!el) return null;
      return { rx: el.offsetLeft + el.offsetWidth, cy: el.offsetTop + el.offsetHeight / 2 };
    };

    const ribbons: Ribbon[] = [];
    const nodes: Node[] = [];

    groups.forEach((g, gi) => {
      const pts = g.memberIds
        .map(edgeOf)
        .filter((p): p is { rx: number; cy: number } => !!p);
      if (pts.length === 0) return;

      const fg = (g.shiftId && SHIFT_FG[g.shiftId]) || DEFAULT_FG;
      const bg = (g.shiftId && SHIFT_BG[g.shiftId]) || DEFAULT_BG;
      const colRight = Math.max(...pts.map((p) => p.rx));
      const ys = pts.map((p) => p.cy);
      const ny = (Math.min(...ys) + Math.max(...ys)) / 2; // メンバーの上下中央に勤務帯ノード
      const nx = colRight + NODE_GAP + gi * RULE_STRIDE;

      for (const p of pts) {
        ribbons.push({ d: ribbonPath(p.rx, p.cy, nx, ny), color: fg });
      }

      const icon = g.satisfied ? "✅" : "⚠️";
      const label = `${g.shiftName} ${icon}`;
      const w = 18 + label.length * 12;
      nodes.push({ x: nx, y: ny - NODE_H / 2, w, h: NODE_H, bg, fg, label, icon });
    });

    if (ribbons.length === 0) {
      setGeom(null);
      return;
    }
    setGeom({ w: grid.scrollWidth, h: grid.scrollHeight, ribbons, nodes });
  }, [gridRef, dayKey, groups]);

  if (!geom) return null;

  return (
    <svg
      className="e-constraint-overlay"
      width={geom.w}
      height={geom.h}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 4,
      }}
      aria-hidden
    >
      {geom.ribbons.map((r, i) => (
        <path key={`r${i}`} d={r.d} fill={r.color} opacity={0.3} />
      ))}
      {geom.nodes.map((n, i) => (
        <g key={`n${i}`}>
          <rect
            x={n.x}
            y={n.y}
            width={n.w}
            height={n.h}
            rx={n.h / 2}
            fill={n.bg}
            stroke={n.fg}
            strokeOpacity={0.5}
          />
          <text
            x={n.x + 10}
            y={n.y + n.h / 2}
            dominantBaseline="central"
            fontSize={12}
            fontWeight={700}
            fill={n.fg}
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
};
