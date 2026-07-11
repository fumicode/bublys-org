'use client';

/**
 * WishIcon — 「できるだけシフト希望に沿う」（全体・on/off）の動的アイコン。
 * ○（したい）と×（避けたい）のセルを描き、有効なら色付き、無効（off）なら淡色にする。
 */
import { FC } from "react";

type Props = { on: boolean };

export const WishIcon: FC<Props> = ({ on }) => {
  const wantBg = on ? "#e8f5e9" : "#f5f5f5";
  const wantFg = on ? "#2e7d32" : "#bdbdbd";
  const avoidBg = on ? "#ffebee" : "#f5f5f5";
  const avoidFg = on ? "#c62828" : "#bdbdbd";
  return (
    <svg className="e-icon-svg" width={80} height={80} viewBox="0 0 80 80" aria-hidden>
      {/* ○ したい */}
      <rect x={16} y={20} width={22} height={22} rx={4} fill={wantBg} stroke={wantFg} strokeWidth={1.4} />
      <circle cx={27} cy={31} r={6} fill="none" stroke={wantFg} strokeWidth={2.2} />
      {/* × 避けたい */}
      <rect x={42} y={20} width={22} height={22} rx={4} fill={avoidBg} stroke={avoidFg} strokeWidth={1.4} />
      <path d="M 48 25 L 58 37 M 58 25 L 48 37" stroke={avoidFg} strokeWidth={2.2} strokeLinecap="round" />
      {/* 状態 */}
      <text x={40} y={60} fontSize={12} fontWeight={700} fill={on ? "#455a64" : "#bdbdbd"} textAnchor="middle">
        {on ? "沿う" : "off"}
      </text>
    </svg>
  );
};
