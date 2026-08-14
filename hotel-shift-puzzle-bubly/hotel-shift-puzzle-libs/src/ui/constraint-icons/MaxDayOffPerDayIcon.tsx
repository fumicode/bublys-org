'use client';

/**
 * MaxDayOffPerDayIcon — 「1日に休めるのは N 人まで」（稼働日ごと＝縦）の動的アイコン。
 * 縦の“1日”カラムに休みチップ（橙）を積み、上限キャップ線と ≤N を示す。
 */
import { FC } from "react";

type Props = { max: number };

export const MaxDayOffPerDayIcon: FC<Props> = ({ max }) => {
  const shown = Math.min(Math.max(0, max), 3);
  return (
    <svg className="e-icon-svg" width={80} height={80} viewBox="0 0 80 80" aria-hidden>
      {/* 1日カラム */}
      <rect x={27} y={12} width={26} height={44} rx={6} fill="#fff" stroke="#cfd8dc" strokeWidth={1.4} />
      {/* 上限キャップ */}
      <line x1={23} y1={15} x2={57} y2={15} stroke="#e57373" strokeWidth={2.6} strokeLinecap="round" />
      {/* 休みチップ（下から積む） */}
      {Array.from({ length: shown }).map((_, i) => {
        const y = 44 - i * 12;
        return (
          <g key={i}>
            <rect x={31} y={y} width={18} height={10} rx={3} fill="#ffe0b2" stroke="#fb8c00" strokeWidth={1.2} />
            <text x={40} y={y + 8} fontSize={8} fill="#e65100" textAnchor="middle">
              休
            </text>
          </g>
        );
      })}
      {/* 値 */}
      <text x={40} y={73} fontSize={14} fontWeight={700} fill="#455a64" textAnchor="middle">
        ≤{max}
      </text>
    </svg>
  );
};
