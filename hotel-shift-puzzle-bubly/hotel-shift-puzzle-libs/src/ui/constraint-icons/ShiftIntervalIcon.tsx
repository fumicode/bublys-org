'use client';

/**
 * ShiftIntervalIcon — 「遅番の翌日は早番・中番に入れない」（人ごと＝横）の動的アイコン。
 *
 * 人の1行を横に切り取り、前日のセル（遅番）と翌日のセル（早番・中番）を隣り合わせに描く。
 * 2つのセルの境目に赤い切れ目を入れ、翌日側のセルには赤い斜線を引いて「ここには入れない」を示す。
 * 下の数字は根拠のインターバル時間（8h）。
 *
 * 表のセルに出る違反マーカー（境目の赤い縦線＋半円）と同じ「境目に印」という形にしてあるので、
 * バーのアイコンと表の警告が同じルールの話だと分かる。
 */
import { FC } from "react";
import type { IconColor } from "./common.js";

type Props = {
  /** 前日の勤務帯名（例: "遅番"） */
  fromShiftName: string;
  /** その翌日に入れない勤務帯名（例: ["早番", "中番"]） */
  forbiddenShiftNames: string[];
  /** 根拠となる勤務間インターバル（時間） */
  restHours: number;
  /** 勤務帯名 → 色。省略時はグレー */
  colorOf?: (shiftName: string) => IconColor;
};

const NEUTRAL: IconColor = { bg: "#eceff1", fg: "#607d8b" };
const ALERT = "#e53935";

/** セルに描く1文字（勤務帯名の頭文字。表のセルと違い数字は使わない＝図として読ませる） */
const initial = (name: string) => name.slice(0, 1);

/** 翌日側に並べるセルは2つまで（3つ目以降は「…」で省く） */
const MAX_NEXT = 2;

export const ShiftIntervalIcon: FC<Props> = ({
  fromShiftName,
  forbiddenShiftNames,
  restHours,
  colorOf = () => NEUTRAL,
}) => {
  const from = colorOf(fromShiftName);
  const nextNames = forbiddenShiftNames.slice(0, MAX_NEXT);
  const overflow = forbiddenShiftNames.length > MAX_NEXT;

  // 前日セル / 境目 / 翌日セル群 の座標
  const cellW = 18;
  const cellH = 22;
  const cellGap = 3;
  const y = 18;
  const prevX = 4;
  const boundaryX = prevX + cellW + cellGap; // 2日の境目
  const nextX0 = boundaryX + cellGap;

  return (
    <svg className="e-icon-svg" width={80} height={80} viewBox="0 0 80 80" aria-hidden>
      {/* 前日（遅番）のセル */}
      <rect
        x={prevX}
        y={y}
        width={cellW}
        height={cellH}
        rx={3}
        fill={from.bg}
        stroke={from.fg}
        strokeWidth={1.4}
      />
      <text
        x={prevX + cellW / 2}
        y={y + cellH / 2 + 4}
        fontSize={12}
        fontWeight={700}
        fill={from.fg}
        textAnchor="middle"
      >
        {initial(fromShiftName)}
      </text>

      {/* 2日の境目（ここが足りていない＝インターバル）。表の違反マーカーと同じ赤。 */}
      <line
        x1={boundaryX}
        y1={y - 3}
        x2={boundaryX}
        y2={y + cellH + 3}
        stroke={ALERT}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <circle cx={boundaryX} cy={y + cellH / 2} r={4.5} fill={ALERT} />

      {/* 翌日に入れない勤務帯のセル（赤い斜線で打ち消す） */}
      {nextNames.map((name, i) => {
        const color = colorOf(name);
        const x = nextX0 + i * (cellW + cellGap);
        return (
          <g key={name}>
            <rect
              x={x}
              y={y}
              width={cellW}
              height={cellH}
              rx={3}
              fill={color.bg}
              stroke={color.fg}
              strokeWidth={1.4}
              opacity={0.55}
            />
            <text
              x={x + cellW / 2}
              y={y + cellH / 2 + 4}
              fontSize={12}
              fontWeight={700}
              fill={color.fg}
              textAnchor="middle"
              opacity={0.55}
            >
              {initial(name)}
            </text>
            <line
              x1={x + 2}
              y1={y + cellH - 2}
              x2={x + cellW - 2}
              y2={y + 2}
              stroke={ALERT}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {overflow && (
        <text
          x={nextX0 + nextNames.length * (cellW + cellGap) + 2}
          y={y + cellH / 2 + 4}
          fontSize={11}
          fill="#90a4ae"
        >
          …
        </text>
      )}

      {/* 根拠のインターバル時間 */}
      <text x={40} y={60} fontSize={14} fontWeight={700} fill={ALERT} textAnchor="middle">
        {restHours}h
      </text>
    </svg>
  );
};
