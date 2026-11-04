'use client';

/**
 * MaxConsecutiveIcon — 「連勤は最大 N 日まで」（人ごと＝横）の動的アイコン。
 * 横に連続した出勤セル（勤務表のセルと同じ灰色の枠）を N 個ぶん並べ、末尾に停止バー
 * （休みで区切る）を置き ≤N を示す。停止バーの先に「超えた1日」のセル（点線の枠）を1つ置く。
 * セルの下には勤務表の連勤の線と同じグラデーション
 * （何日目かで 緑 → 黄緑（N-1日目）→ 黄（N日目））の線を通し、停止バーで切って超えた日は赤。
 *
 * onCommit を渡すと（バブルの大きい図）、停止バーを横にドラッグして N を変えられる。
 * 停止バーは指にいちばん近いマスの境目に吸い付き、左にあるマスの数がそのまま N になる。
 */
import { FC, useId, useRef, useState, type PointerEvent } from "react";
import { ICON_SIZE, IconValueText } from "./common.js";
import { RUN_TONE_COLOR } from "../schedule-grid/cellSymbols.js";
import { workDayTone } from "../schedule-grid/runMarkPlacement.js";
import { workGradientStops } from "../schedule-grid/RunMarks.js";

type Props = {
  max: number;
  /** 1辺のサイズ（px）。バーは既定の80、バブルの図は大きく描く */
  size?: number;
  /** 渡されたときだけ、図の中の数を押して・停止バーをドラッグして変えられる（バブルの大きい図） */
  onCommit?: (value: number) => void;
};

/** 描けるマスの数。停止バーのドラッグで選べる N もこの範囲（1〜MAX_CELLS） */
export const MAX_CELLS = 6;

const X0 = 10;
const GAP = 1.5;
/** 停止バーぶん、超えた1日のマスを右へずらす幅 */
const BAR_GAP = 4;

/** N マス＋超えた1マスを、停止バーぶんの隙間をあけて横 60 に収める並べ方 */
const layoutOf = (run: number) => {
  const pitch = Math.min(10.5, (60 - BAR_GAP) / (run + 1));
  return {
    pitch,
    w: pitch - GAP,
    cellX: (i: number) => X0 + i * pitch + (i >= run ? BAR_GAP : 0),
    barX: X0 + run * pitch - GAP / 2 + BAR_GAP / 2,
  };
};

/**
 * 停止バーをアイコン座標の x に持ってきたときの N。
 * N ごとに並べ方（マスの幅）が変わるので、「N のときに停止バーが描かれる位置」が
 * x にいちばん近い N を選ぶ。そうすれば描かれた停止バーが必ず指のいちばん近くに来る。
 */
export const maxConsecutiveAtX = (x: number): number => {
  let best = 1;
  for (let n = 2; n <= MAX_CELLS; n++) {
    if (Math.abs(layoutOf(n).barX - x) < Math.abs(layoutOf(best).barX - x)) best = n;
  }
  return best;
};

export const MaxConsecutiveIcon: FC<Props> = ({ max, size = ICON_SIZE, onCommit }) => {
  // ドラッグ中の N（指を離すまでは保存しない。描くのはこちら）
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const shown = dragging ?? max;
  const run = Math.min(Math.max(0, shown), MAX_CELLS);
  const { pitch, w, cellX, barX } = layoutOf(run);
  // 同じ画面にアイコンが複数あっても、グラデーションの id がぶつからないようにする
  const gradientId = `run-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // 描ける数（run）に収まらないときも、末尾が上限の色になるよう run で数える
  const dayTones = Array.from({ length: run }, (_, i) => workDayTone(i + 1, run));

  /** 画面の座標 → アイコン（viewBox）の x */
  const iconXOf = (e: PointerEvent) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return undefined;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()).x;
  };

  const barHandlers = onCommit && {
    onPointerDown: (e: PointerEvent) => {
      // バブル自体のドラッグに取られないよう、ここで止める
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(run);
    },
    onPointerMove: (e: PointerEvent) => {
      if (dragging === null) return;
      const x = iconXOf(e);
      if (x !== undefined) setDragging(maxConsecutiveAtX(x));
    },
    onPointerUp: () => {
      // 動かしていなければ保存しない（同じ内容のノードを世界線に積まない）
      if (dragging !== null && dragging !== max) onCommit(dragging);
      setDragging(null);
    },
    onPointerCancel: () => setDragging(null),
    onMouseDown: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  };

  return (
    <svg ref={svgRef} className="e-icon-svg" width={size} height={size} viewBox="0 0 80 80" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1={0} x2={1} y1={0} y2={0}>
          {workGradientStops(dayTones).map(({ tone, offset }, i) => (
            <stop key={i} offset={offset} stopColor={RUN_TONE_COLOR[tone]} />
          ))}
        </linearGradient>
      </defs>
      {/* N 連続の出勤セル（勤務表のセルと同じ灰色の枠）＋ 超えた1日（点線の枠） */}
      {Array.from({ length: run + 1 }).map((_, i) => (
        <rect
          key={i}
          x={cellX(i)}
          y={24}
          width={w}
          height={16}
          rx={2}
          fill="#fff"
          stroke="#9e9e9e"
          strokeWidth={1.2}
          strokeDasharray={i === run ? "2 1.5" : undefined}
        />
      ))}
      {/* セルの下を通る連勤の線。上限までは勤務表の線と同じグラデーション、
          停止バーで切って、超えた日は赤 */}
      {run > 0 && (
        <rect
          x={X0}
          y={42}
          width={run * pitch - GAP}
          height={3}
          rx={1.5}
          fill={`url(#${gradientId})`}
        />
      )}
      <rect x={cellX(run)} y={42} width={w} height={3} rx={1.5} fill={RUN_TONE_COLOR.over} />
      {/* 停止バー（ここで連勤が切れる＝休み） */}
      <line
        x1={barX}
        y1={20}
        x2={barX}
        y2={46}
        stroke="#e57373"
        strokeWidth={dragging !== null ? 3.4 : 2.6}
        strokeLinecap="round"
      />
      {/* 停止バーのつかみ（見えない太めの当たり判定） */}
      {barHandlers && (
        <rect
          x={barX - 4}
          y={16}
          width={8}
          height={34}
          fill="transparent"
          style={{ cursor: "ew-resize", touchAction: "none" }}
          {...barHandlers}
        >
          <title>ドラッグして連勤の上限を変える</title>
        </rect>
      )}
      {/* 値 */}
      <IconValueText x={40} y={62} fill="#1565c0" prefix="≤" value={shown} onCommit={onCommit} />
    </svg>
  );
};
