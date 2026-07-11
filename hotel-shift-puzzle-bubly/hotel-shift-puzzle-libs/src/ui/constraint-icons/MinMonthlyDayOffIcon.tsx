'use client';

/**
 * MinMonthlyDayOffIcon — 「月に N 日以上休む」（人ごと＝横）の動的アイコン。
 * 横の“1人の1か月”ストリップに、最低必要な休み（緑）を N 個ぶん塗り、≥N を示す。
 */
import { FC } from "react";

type Props = { min: number };

const CELLS = 10;

export const MinMonthlyDayOffIcon: FC<Props> = ({ min }) => {
  const off = Math.min(Math.max(0, min), CELLS);
  const w = 6;
  const gap = 1;
  const totalW = CELLS * (w + gap) - gap;
  const x0 = (80 - totalW) / 2;
  return (
    <svg className="e-icon-svg" width={80} height={80} viewBox="0 0 80 80" aria-hidden>
      {/* 1人の1か月ストリップ（横） */}
      {Array.from({ length: CELLS }).map((_, i) => {
        const isOff = i < off;
        return (
          <rect
            key={i}
            x={x0 + i * (w + gap)}
            y={26}
            width={w}
            height={16}
            rx={1.5}
            fill={isOff ? "#c8e6c9" : "#fff"}
            stroke={isOff ? "#43a047" : "#cfd8dc"}
            strokeWidth={1.2}
          />
        );
      })}
      {/* 値 */}
      <text x={40} y={62} fontSize={14} fontWeight={700} fill="#2e7d32" textAnchor="middle">
        ≥{min}
      </text>
    </svg>
  );
};
