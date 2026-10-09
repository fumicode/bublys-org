'use client';

/**
 * ReportPriorityIcon — 「参照レポートの貢献度で休みを優先する」（全体・on/off）の動的アイコン。
 * ★の高い人から順に休み（休）を取る並びを描き、有効なら色付き、無効（off）なら淡色にする。
 */
import { FC } from "react";
import { ICON_SIZE } from "./common.js";

type Props = {
  on: boolean;
  /** 1辺のサイズ（px）。バーは既定の80、バブルの図は大きく描く */
  size?: number;
};

export const ReportPriorityIcon: FC<Props> = ({ on, size = ICON_SIZE }) => {
  const star = on ? "#f9a825" : "#bdbdbd";
  const offBg = on ? "#eceff1" : "#f5f5f5";
  const offFg = on ? "#546e7a" : "#bdbdbd";
  // ★の数が多い人ほど先（左）に休みを取る
  const rows = [3, 2, 1];
  return (
    <svg className="e-icon-svg" width={size} height={size} viewBox="0 0 80 80" aria-hidden>
      {rows.map((stars, i) => {
        const x = 14 + i * 18;
        return (
          <g key={stars}>
            <text x={x + 8} y={22} fontSize={9} fill={star} textAnchor="middle">
              {"★".repeat(stars)}
            </text>
            <rect x={x} y={28} width={16} height={16} rx={3} fill={offBg} stroke={offFg} strokeWidth={1.2} />
            <text x={x + 8} y={40} fontSize={9} fontWeight={700} fill={offFg} textAnchor="middle">
              休
            </text>
          </g>
        );
      })}
      {/* 状態 */}
      <text x={40} y={62} fontSize={12} fontWeight={700} fill={on ? "#455a64" : "#bdbdbd"} textAnchor="middle">
        {on ? "優先" : "off"}
      </text>
    </svg>
  );
};
