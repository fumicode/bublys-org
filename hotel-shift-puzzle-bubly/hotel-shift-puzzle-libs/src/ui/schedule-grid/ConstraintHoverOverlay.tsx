import { FC, RefObject, useLayoutEffect, useState } from "react";
import { SHIFT_FG } from "./constants.js";

/** ホバー中セルと制約関係にある相手（1責任者ルール分）。 */
export type ConstraintHoverGroup = {
  /** 担当勤務帯の id（線の色に使う。未解決なら既定色）。 */
  shiftId?: string;
  /** 同じルールの相手スタッフID（ホバー中の本人は除く。表示中の人だけ）。 */
  partnerIds: string[];
};

type Props = {
  /** グリッド本体（.e-grid）。セル座標の測定と、重ねる SVG の基準にする。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** ホバー中の日（列）の key。 */
  dayKey: string;
  /** ホバー中のスタッフID（線の起点）。 */
  hoveredStaffId: string;
  /** ホバー中の本人を含む各責任者ルールの相手集合。 */
  groups: ConstraintHoverGroup[];
};

type Geom = {
  w: number;
  h: number;
  lines: Array<{ d: string; color: string }>;
  dots: Array<{ x: number; y: number; color: string; strong: boolean }>;
};

const DEFAULT_COLOR = "#607d8b";

/**
 * 勤務表グリッドにホバー中だけ重なる、制約関係の可視化オーバーレイ。
 *
 * ホバーしたセル（その人・その日）から、同じ責任者ルールの相手の「同じ日のセル」へ曲線を引く。
 * 線の色は担当勤務帯の色（LeaderRuleDiagram と同じ SHIFT_FG）。同じ列＝縦に並ぶので、数字を
 * 隠さないよう右側へ膨らませる。複数ルール（早責＋予責など）は色ぶんだけ膨らみをずらす。
 *
 * 座標は各セルの offsetLeft/offsetTop（.e-grid を基準にした content 座標）で測る。SVG も
 * content サイズで .e-grid 内に絶対配置するため、グリッドのスクロールに自然に追従する。
 * pointer-events:none なのでホバー判定やセル操作の邪魔をしない。
 */
export const ConstraintHoverOverlay: FC<Props> = ({
  gridRef,
  dayKey,
  hoveredStaffId,
  groups,
}) => {
  const [geom, setGeom] = useState<Geom | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      setGeom(null);
      return;
    }
    const rectOf = (staffId: string) => {
      const el = grid.querySelector<HTMLElement>(
        `[data-cell-key="${staffId}:${dayKey}"]`
      );
      if (!el) return null;
      return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    };

    const anchor = rectOf(hoveredStaffId);
    if (!anchor) {
      setGeom(null);
      return;
    }
    const ax = anchor.x + anchor.w / 2;
    const ay = anchor.y + anchor.h / 2;
    const colRight = anchor.x + anchor.w;

    const lines: Geom["lines"] = [];
    const dots: Geom["dots"] = [{ x: ax, y: ay, color: "#37474f", strong: true }];

    groups.forEach((g, gi) => {
      const color = (g.shiftId && SHIFT_FG[g.shiftId]) || DEFAULT_COLOR;
      for (const pid of g.partnerIds) {
        const r = rectOf(pid);
        if (!r) continue;
        const px = r.x + r.w / 2;
        const py = r.y + r.h / 2;
        const dist = Math.abs(py - ay);
        // 同じ列なので右側へ弓なりに膨らませる（縦距離に応じて・ルールごとに少しずらす）。
        const bulge = colRight + 8 + Math.min(28, dist * 0.28) + gi * 7;
        const my = (ay + py) / 2;
        lines.push({ d: `M ${ax} ${ay} Q ${bulge} ${my} ${px} ${py}`, color });
        dots.push({ x: px, y: py, color, strong: false });
      }
    });

    setGeom({ w: grid.scrollWidth, h: grid.scrollHeight, lines, dots });
  }, [gridRef, dayKey, hoveredStaffId, groups]);

  if (!geom || geom.lines.length === 0) return null;

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
      {geom.lines.map((l, i) => (
        <path
          key={`l${i}`}
          d={l.d}
          fill="none"
          stroke={l.color}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      {geom.dots.map((dt, i) => (
        <circle
          key={`d${i}`}
          cx={dt.x}
          cy={dt.y}
          r={dt.strong ? 4.5 : 3.5}
          fill={dt.color}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
};
