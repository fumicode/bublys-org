'use client';

/**
 * AllowedShiftIcon — 「入れない勤務帯には入れない」（人ごと＝横・on/off）の動的アイコン。
 * 1人ぶんの勤務帯セル（早・中・遅）を並べ、入れる帯は色付き、入れない帯は斜線＋×で描く。
 * 有効なら色付き、無効（off）なら淡色にする。
 */
import { FC } from "react";
import { ICON_SIZE } from "./common.js";

type Props = {
  on: boolean;
  /** 1辺のサイズ（px）。バーは既定の80、バブルの図は大きく描く */
  size?: number;
};

export const AllowedShiftIcon: FC<Props> = ({ on, size = ICON_SIZE }) => {
  const okBg = on ? "#e3f2fd" : "#f5f5f5";
  const okFg = on ? "#1565c0" : "#bdbdbd";
  const ngFg = on ? "#c62828" : "#bdbdbd";
  const cells = [
    { x: 12, label: "早", allowed: false },
    { x: 32, label: "中", allowed: true },
    { x: 52, label: "遅", allowed: true },
  ];
  return (
    <svg className="e-icon-svg" width={size} height={size} viewBox="0 0 80 80" aria-hidden>
      <defs>
        <pattern id="allowed-shift-hatch" width={4} height={4} patternUnits="userSpaceOnUse">
          <rect width={4} height={4} fill="#fafafa" />
          <path d="M 0 4 L 4 0" stroke="#e0e0e0" strokeWidth={1} />
        </pattern>
      </defs>
      {cells.map((c) => (
        <g key={c.label}>
          <rect
            x={c.x}
            y={20}
            width={16}
            height={22}
            rx={3}
            fill={c.allowed ? okBg : "url(#allowed-shift-hatch)"}
            stroke={c.allowed ? okFg : ngFg}
            strokeWidth={1.3}
          />
          <text
            x={c.x + 8}
            y={35}
            fontSize={10}
            fontWeight={700}
            fill={c.allowed ? okFg : "#bdbdbd"}
            textAnchor="middle"
          >
            {c.label}
          </text>
        </g>
      ))}
      {/* 入れない帯に入れたら違反 */}
      <path d="M 14 22 L 26 40 M 26 22 L 14 40" stroke={ngFg} strokeWidth={2} strokeLinecap="round" />
      {/* 状態 */}
      <text x={40} y={60} fontSize={12} fontWeight={700} fill={on ? "#455a64" : "#bdbdbd"} textAnchor="middle">
        {on ? "守る" : "off"}
      </text>
    </svg>
  );
};
