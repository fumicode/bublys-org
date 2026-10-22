'use client';

/**
 * DayOffStyleIcon — 休みの形（連休型／分散型）のアイコン。
 * 1人の数日を横に並べ、休み（緑）が隣り合っていれば連休型、離れていれば分散型。
 * 連休型で「何連まで」が決まっていれば、その数を右に添える。
 *
 * 描き方は制約アイコン（MinMonthlyDayOffIcon の「1人の横の帯・休みは緑」）に揃える。
 * いまはスタッフ名の横に出す小さいもの（高さ10px）だけ。休みの取り方を制約にするとき、
 * 制約バーの大きさ（ICON_SIZE）の絵をここに足す。
 */
import { FC } from "react";
import type { DayOffStyle } from "../../domain/index.js";

type Props = {
  dayOffStyle: DayOffStyle;
  /** 高さ（px）。幅は帯と数字の長さから決まる */
  height?: number;
};

/** 5日ぶんの並び（true = 休み）。違いは休みがくっついているか、離れているかだけ */
const CLUSTERED_DAYS = [false, false, false, true, true];
const SPREAD_DAYS = [false, true, false, false, true];

const H = 10;
const CELL_W = 4;
const GAP = 1;
const STROKE = 0.8;
const DIGIT_W = 5;

export const DayOffStyleIcon: FC<Props> = ({ dayOffStyle, height = H }) => {
  const days = dayOffStyle.isClustered ? CLUSTERED_DAYS : SPREAD_DAYS;
  const stripW = days.length * (CELL_W + GAP) - GAP;
  const run = dayOffStyle.maxRun === undefined ? "" : String(dayOffStyle.maxRun);
  const viewW = stripW + (run ? 1 + run.length * DIGIT_W : 0);
  return (
    <svg
      className="e-icon-svg"
      width={(viewW * height) / H}
      height={height}
      viewBox={`0 0 ${viewW} ${H}`}
      aria-hidden
    >
      {days.map((off, i) => (
        <rect
          key={i}
          x={i * (CELL_W + GAP) + STROKE / 2}
          y={STROKE / 2}
          width={CELL_W - STROKE}
          height={H - STROKE}
          rx={1}
          fill={off ? "#c8e6c9" : "#fff"}
          stroke={off ? "#43a047" : "#cfd8dc"}
          strokeWidth={STROKE}
        />
      ))}
      {/* 何連まで（連休型で決まっているときだけ） */}
      {run && (
        <text
          x={viewW}
          y={H - 1}
          fontSize={9}
          fontWeight={700}
          fill="#2e7d32"
          textAnchor="end"
        >
          {run}
        </text>
      )}
    </svg>
  );
};
