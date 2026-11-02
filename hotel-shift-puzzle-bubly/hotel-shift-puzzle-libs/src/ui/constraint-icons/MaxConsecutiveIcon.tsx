'use client';

/**
 * MaxConsecutiveIcon — 「連勤は最大 N 日まで」（人ごと＝横）の動的アイコン。
 * 横に連続した出勤セル（勤務表のセルと同じ灰色の枠）を N 個ぶん並べ、末尾に停止バー
 * （休みで区切る）を置き ≤N を示す。停止バーの先に「超えた1日」のセル（点線の枠）を1つ置く。
 * セルの下には勤務表の連勤の線と同じグラデーション
 * （何日目かで 緑 → 黄緑（N-1日目）→ 黄（N日目））の線を通し、停止バーで切って超えた日は赤。
 */
import { FC, useId } from "react";
import { ICON_SIZE, IconValueText } from "./common.js";
import { RUN_TONE_COLOR } from "../schedule-grid/constants.js";
import { workDayTone } from "../schedule-grid/runMarkPlacement.js";
import { workGradientStops } from "../schedule-grid/RunMarks.js";

type Props = {
  max: number;
  /** 1辺のサイズ（px）。バーは既定の80、バブルの図は大きく描く */
  size?: number;
  /** 渡されたときだけ、図の中の数を押して変えられる（バブルの大きい図） */
  onCommit?: (value: number) => void;
};

const MAX_CELLS = 6;

export const MaxConsecutiveIcon: FC<Props> = ({ max, size = ICON_SIZE, onCommit }) => {
  const run = Math.min(Math.max(0, max), MAX_CELLS);
  // 上限の N 個＋超えた1個を、停止バーぶんの隙間（barGap）をあけて横 60 に収める
  const barGap = 4;
  const pitch = Math.min(10.5, (60 - barGap) / (run + 1));
  const gap = 1.5;
  const w = pitch - gap;
  const x0 = 10;
  const cellX = (i: number) => x0 + i * pitch + (i >= run ? barGap : 0);
  const barX = x0 + run * pitch - gap / 2 + barGap / 2;
  // 同じ画面にアイコンが複数あっても、グラデーションの id がぶつからないようにする
  const gradientId = `run-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // 描ける数（run）に収まらないときも、末尾が上限の色になるよう run で数える
  const dayTones = Array.from({ length: run }, (_, i) => workDayTone(i + 1, run));
  return (
    <svg className="e-icon-svg" width={size} height={size} viewBox="0 0 80 80" aria-hidden>
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
          x={x0}
          y={42}
          width={run * pitch - gap}
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
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {/* 値 */}
      <IconValueText x={40} y={62} fill="#1565c0" prefix="≤" value={max} onCommit={onCommit} />
    </svg>
  );
};
