'use client';

/**
 * MaxConsecutiveIcon — 「連勤は最大 N 日まで」（人ごと＝横）の動的アイコン。
 * 横に連続した出勤セル（青）を N 個ぶん並べ、末尾に停止バー（休みで区切る）を置き ≤N を示す。
 */
import { FC } from "react";

type Props = { max: number };

const MAX_CELLS = 6;

export const MaxConsecutiveIcon: FC<Props> = ({ max }) => {
  const run = Math.min(Math.max(0, max), MAX_CELLS);
  const w = 9;
  const gap = 1.5;
  const x0 = 10;
  return (
    <svg className="e-icon-svg" width={80} height={80} viewBox="0 0 80 80" aria-hidden>
      {/* N 連続の出勤セル（早番色） */}
      {Array.from({ length: run }).map((_, i) => (
        <rect
          key={i}
          x={x0 + i * (w + gap)}
          y={24}
          width={w}
          height={16}
          rx={2}
          fill="#e3f2fd"
          stroke="#1565c0"
          strokeWidth={1.2}
        />
      ))}
      {/* 停止バー（ここで連勤が切れる＝休み） */}
      <line
        x1={x0 + run * (w + gap) + 1}
        y1={20}
        x2={x0 + run * (w + gap) + 1}
        y2={44}
        stroke="#e57373"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {/* 値 */}
      <text x={40} y={62} fontSize={14} fontWeight={700} fill="#1565c0" textAnchor="middle">
        ≤{max}
      </text>
    </svg>
  );
};
