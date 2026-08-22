import { FC, RefObject, useLayoutEffect, useMemo, useState } from "react";
import type { SVGProps } from "react";
import styled, { css, keyframes } from "styled-components";
import type { Keyframes } from "styled-components";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";

/** ルールのメンバー1人分。covering＝その日に担当勤務帯へ実際に入っている（＝充足に寄与）か。 */
export type ConstraintHoverMember = { staffId: string; covering: boolean };

/** ホバー中セルの人が属する1責任者ルール分の関係（勤務帯→全メンバー）。 */
export type ConstraintHoverGroup = {
  /** 担当勤務帯の id（色に使う。未解決なら既定色）。 */
  shiftId?: string;
  /** 担当勤務帯の表示名（例: 早番）。 */
  shiftName: string;
  /** ルール名（タイトル。例: 早責）。ノードの見出しとして出す。 */
  ruleLabel: string;
  /** 最低必要人数（ノードの◯の中に入れる）。 */
  minCount: number;
  /** ルールの全メンバー（表示中の人だけ。本人も含む）。 */
  members: ConstraintHoverMember[];
  /** その日にルールが満たされているか（✅/⚠️ の切り替え）。 */
  satisfied: boolean;
  /** メンバー全員がその日に休み（＝誰も入れず絶対に満たせない）。特別な黄色・同時点滅で警告する。 */
  allDayOff: boolean;
};

type Props = {
  /** グリッド本体（.e-grid）。セル座標の測定と、重ねる SVG の基準にする。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /** ホバー中の日（列）の key。 */
  dayKey: string;
  /** ホバー中セルの人が属する責任者ルール群。 */
  groups: ConstraintHoverGroup[];
};

/**
 * リボン（面）の描画モード。
 *   solid=入っている人（濃く）/ faint=薄く / blink=巡回点灯（誰か入って）/
 *   sync=全員休みの警告（黄色・全体同時点滅）
 */
type RibbonMode = "solid" | "faint" | "blink" | "sync";
type Ribbon = {
  d: string;
  color: string;
  mode: RibbonMode;
  /** blink 用: グループ内の点灯順 index と、巡回する本数 count。 */
  index: number;
  count: number;
};
type Node = {
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  fg: string;
  /** ルール名（タイトル。例: 早責） */
  ruleLabel: string;
  /** 担当勤務帯名（例: 早番） */
  shiftName: string;
  /** 充足アイコン（✅ / ⚠️） */
  icon: string;
  /** ◯の中に入れる最低必要人数 */
  minCount: number;
  /** 全員休みの警告ノード（黄色・同時点滅）か。 */
  sync?: boolean;
};
/** 制約全体（リボン＋ノード）を包む矩形。この下の表を backdrop blur でぼかす。 */
type Box = { x: number; y: number; w: number; h: number };
type Geom = { w: number; h: number; ribbons: Ribbon[]; nodes: Node[]; box: Box };

const DEFAULT_FG = "#607d8b";
const DEFAULT_BG = "#eceff1";
const RIBBON_W = 12; // リボン（面）の基本の太さ
const RIBBON_W_STRONG = 18; // 入っている人（covering）の太さ
const NODE_GAP = 40; // 列の右端から勤務帯ノードまでの距離
const NODE_H = 26; // ◯（最低人数バッジ）が収まる高さ
const NODE_MARGIN = 12; // 複数ルールのノードを右へ並べるときの間隔
const SLOT_MS = 700; // 巡回1本あたりの点灯スロット
const BOX_PAD = 14; // 制約全体を包む矩形の余白

/** ノード幅（◯バッジ ＋ ルール名 ＋ 勤務帯名 ＋ 充足アイコン が収まる幅）。 */
const nodeWidth = (ruleLabel: string, shiftName: string): number =>
  NODE_H + 6 + ruleLabel.length * 13 + 8 + shiftName.length * 12 + 20 + 12;

const OP_HIGH = 0.62; // 濃い（入っている／点灯中）
const OP_LOW = 0.12; // 薄い（入っていない／消灯中）

// 全員休み（絶対に満たせない）の警告色。黄色。
const WARN_FG = "#f9a825";
const WARN_BG = "#fff8e1";
const SYNC_MS = 800; // 同時点滅の周期

/** 全体が同時に点滅（巡回ではなく一斉に明滅）。 */
const syncBlink = keyframes`
  0%, 100% { opacity: ${OP_LOW}; }
  50% { opacity: 0.85; }
`;

/** 太さ width の半透明リボン（面）のパスを作る。start（セル右端）→ node（勤務帯）を結ぶ。 */
const ribbonPath = (
  sx: number,
  sy: number,
  nx: number,
  ny: number,
  width: number
): string => {
  const half = width / 2;
  const c1x = sx + (nx - sx) * 0.45;
  const c2x = nx - (nx - sx) * 0.25;
  return (
    `M ${sx} ${sy - half} ` +
    `C ${c1x} ${sy - half}, ${c2x} ${ny - half}, ${nx} ${ny - half} ` +
    `L ${nx} ${ny + half} ` +
    `C ${c2x} ${ny + half}, ${c1x} ${sy + half}, ${sx} ${sy + half} Z`
  );
};

/** 巡回点灯（LeaderRuleDiagram と同じ発想）。on 窓は先頭 1/count に置き、arm ごとに delay をずらす。 */
const blinkKeyframes = (count: number) => {
  const onPct = count > 0 ? 100 / count : 100;
  return keyframes`
    0% { opacity: ${OP_LOW}; }
    ${(onPct * 0.15).toFixed(2)}% { opacity: ${OP_HIGH}; }
    ${(onPct * 0.85).toFixed(2)}% { opacity: ${OP_HIGH}; }
    ${onPct.toFixed(2)}% { opacity: ${OP_LOW}; }
    100% { opacity: ${OP_LOW}; }
  `;
};

/**
 * 勤務表グリッドにホバー中だけ重なる、責任者制約の関係オーバーレイ。
 *
 * 担当勤務帯（早番など）のノードを列の右に置き、そこから各メンバーのセル右端へ面（リボン）を伸ばす。
 * さらに「中身」を描く:
 *   - 入っている人（担当勤務帯に割当済み＝充足に寄与）… 太く濃い面（solid）。
 *   - 充足済みで入っていない人 … 薄い面（faint）。
 *   - 未充足のとき入っていない候補 … 制約バブルと同じくパッパッと巡回点灯（blink）＝「誰か入って」。
 * 面の背後は backdrop blur でぼかし、関係を浮き立たせる（面の形に clip-path）。
 */
export const ConstraintHoverOverlay: FC<Props> = ({ gridRef, dayKey, groups }) => {
  const [geom, setGeom] = useState<Geom | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      setGeom(null);
      return;
    }
    const edgeOf = (staffId: string) => {
      const el = grid.querySelector<HTMLElement>(
        `[data-cell-key="${staffId}:${dayKey}"]`
      );
      if (!el) return null;
      return { rx: el.offsetLeft + el.offsetWidth, cy: el.offsetTop + el.offsetHeight / 2 };
    };

    const ribbons: Ribbon[] = [];
    const nodes: Node[] = [];
    // 複数ルールのノードは実幅ぶんずらして右へ並べる（幅が可変なので重ならないように）。
    let offset = 0;

    // 制約全体を包む矩形（この下の表を blur でぼかす）。リボンの端点とノードから求める。
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const touch = (x1: number, y1: number, x2: number, y2: number) => {
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    };

    groups.forEach((g) => {
      const pts = g.members
        .map((m) => {
          const e = edgeOf(m.staffId);
          return e ? { ...e, covering: m.covering } : null;
        })
        .filter((p): p is { rx: number; cy: number; covering: boolean } => !!p);
      if (pts.length === 0) return;

      const fg = (g.shiftId && SHIFT_FG[g.shiftId]) || DEFAULT_FG;
      const bg = (g.shiftId && SHIFT_BG[g.shiftId]) || DEFAULT_BG;
      const colRight = Math.max(...pts.map((p) => p.rx));
      const ys = pts.map((p) => p.cy);
      const ny = (Math.min(...ys) + Math.max(...ys)) / 2;
      const nx = colRight + NODE_GAP + offset;
      const w = nodeWidth(g.ruleLabel, g.shiftName);
      offset += w + NODE_MARGIN;

      // 包む矩形の範囲を広げる（リボンの起点セル端＋太さ / ノードの矩形）。
      const half = RIBBON_W_STRONG / 2;
      for (const p of pts) touch(p.rx, p.cy - half, p.rx, p.cy + half);
      touch(nx, ny - NODE_H / 2, nx + w, ny + NODE_H / 2);

      const base = {
        x: nx,
        y: ny - NODE_H / 2,
        w,
        h: NODE_H,
        ruleLabel: g.ruleLabel,
        shiftName: g.shiftName,
        minCount: g.minCount,
      };

      if (g.allDayOff) {
        // 全員休み＝誰も入れず絶対に満たせない。黄色の面を全体同時に点滅させる。
        for (const p of pts) {
          const d = ribbonPath(p.rx, p.cy, nx, ny, RIBBON_W);
          ribbons.push({ d, color: WARN_FG, mode: "sync", index: 0, count: 0 });
        }
        nodes.push({ ...base, bg: WARN_BG, fg: WARN_FG, icon: "⚠️", sync: true });
        return;
      }

      // 未充足のときに巡回させる対象＝入っていない候補。
      const blinkCount = g.satisfied ? 0 : pts.filter((p) => !p.covering).length;
      let blinkIdx = 0;

      for (const p of pts) {
        const width = p.covering ? RIBBON_W_STRONG : RIBBON_W;
        const d = ribbonPath(p.rx, p.cy, nx, ny, width);
        if (p.covering) {
          ribbons.push({ d, color: fg, mode: "solid", index: 0, count: 0 });
        } else if (g.satisfied) {
          ribbons.push({ d, color: fg, mode: "faint", index: 0, count: 0 });
        } else {
          ribbons.push({ d, color: fg, mode: "blink", index: blinkIdx++, count: blinkCount });
        }
      }

      nodes.push({ ...base, bg, fg, icon: g.satisfied ? "✅" : "⚠️" });
    });

    if (ribbons.length === 0 || !Number.isFinite(minX)) {
      setGeom(null);
      return;
    }
    setGeom({
      w: grid.scrollWidth,
      h: grid.scrollHeight,
      ribbons,
      nodes,
      // 制約全体を包む矩形。この1枚に backdrop blur をかけて下の表をぼかす。
      // 左だけ余白を付けない：リボンはホバー中セルの右端から始まるので、左へ広げると
      // そのセル自身がぼかしに隠れてしまう。上下右にだけ余白を取る。
      box: {
        x: minX,
        y: Math.max(0, minY - BOX_PAD),
        w: maxX - minX + BOX_PAD,
        h: maxY - minY + BOX_PAD * 2,
      },
    });
  }, [gridRef, dayKey, groups]);

  // blink に使う keyframes を本数ごとに用意する（同じ本数は使い回す）。
  const blinkKfByCount = useMemo(() => {
    const map = new Map<number, Keyframes>();
    for (const r of geom?.ribbons ?? []) {
      if (r.mode === "blink" && !map.has(r.count)) map.set(r.count, blinkKeyframes(r.count));
    }
    return map;
  }, [geom]);

  if (!geom) return null;

  return (
    <>
      {/* 制約全体を包む1枚のパネル。ここに backdrop blur をかけて、下の表をぼかす。
          リボン・ノードはこの上に描かれ、ノード自体も半透明なので すりガラス に見える。 */}
      <div
        className="e-constraint-blur"
        style={{
          position: "absolute",
          left: geom.box.x,
          top: geom.box.y,
          width: geom.box.w,
          height: geom.box.h,
          pointerEvents: "none",
          zIndex: 3,
          // 左辺はホバー中セルの右端にぴったり付くので角を落とさない（右側だけ角丸）。
          borderRadius: "0 14px 14px 0",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          background: "rgba(255, 255, 255, 0.22)",
        }}
        aria-hidden
      />
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
        {geom.ribbons.map((r, i) => {
          if (r.mode === "sync") {
            return <SyncRibbon key={`r${i}`} d={r.d} fill={r.color} />;
          }
          if (r.mode === "blink") {
            return (
              <BlinkRibbon
                key={`r${i}`}
                d={r.d}
                fill={r.color}
                $anim={blinkKfByCount.get(r.count) as Keyframes}
                $dur={Math.max(1, r.count) * SLOT_MS}
                $delay={r.index * SLOT_MS}
              />
            );
          }
          return (
            <path
              key={`r${i}`}
              d={r.d}
              fill={r.color}
              opacity={r.mode === "solid" ? OP_HIGH : OP_LOW}
            />
          );
        })}
        {geom.nodes.map((n, i) => {
          const NodeGroup = n.sync ? SyncNodeGroup : "g";
          const cy = n.y + n.h / 2;
          const badgeCx = n.x + n.h / 2;
          const badgeR = n.h / 2 - 3;
          return (
            <NodeGroup key={`n${i}`}>
              {/* 背後は blur で切り抜き済み。ノード自体は半透明にして「透明でぼんやり」見せる。 */}
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={n.h / 2}
                fill={n.bg}
                fillOpacity={0.55}
                stroke={n.fg}
                strokeOpacity={0.5}
              />
              {/* 最低必要人数を◯の中に入れる（③ のような見た目） */}
              <circle cx={badgeCx} cy={cy} r={badgeR} fill={n.fg} />
              <text
                x={badgeCx}
                y={cy}
                dominantBaseline="central"
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#fff"
              >
                {Math.max(1, n.minCount)}
              </text>
              {/* ルール名（タイトル）＋ 担当勤務帯 ＋ 充足アイコン */}
              <text
                x={n.x + n.h + 4}
                y={cy}
                dominantBaseline="central"
                fontSize={12}
                fontWeight={700}
                fill={n.fg}
              >
                {n.ruleLabel}
                <tspan dx={6} fontSize={11} fontWeight={600} fillOpacity={0.8}>
                  {n.shiftName} {n.icon}
                </tspan>
              </text>
            </NodeGroup>
          );
        })}
      </svg>
    </>
  );
};

/** 未充足のとき巡回点灯する面。opacity を keyframes で切り替える。 */
const BlinkRibbon = styled.path<
  SVGProps<SVGPathElement> & { $anim: Keyframes; $dur: number; $delay: number }
>`
  ${({ $anim, $dur, $delay }) => css`
    opacity: ${OP_LOW};
    animation: ${$anim} ${$dur}ms linear ${$delay}ms infinite;
  `}
`;

/** 全員休みの警告面。黄色で全体同時に点滅する（delay 無し＝一斉）。 */
const SyncRibbon = styled.path<SVGProps<SVGPathElement>>`
  opacity: ${OP_LOW};
  animation: ${syncBlink} ${SYNC_MS}ms ease-in-out infinite;
`;

/** 全員休みの警告ノード。面と同じ周期・タイミングで一斉に点滅する。 */
const SyncNodeGroup = styled.g`
  animation: ${syncBlink} ${SYNC_MS}ms ease-in-out infinite;
`;
