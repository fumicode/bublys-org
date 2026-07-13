'use client';

/**
 * LeaderConstraintIcon — 責任者（リーダー）制約の動的アイコン。
 *
 * schedule-leader-rule バブルの収束図（LeaderRuleDiagram）を約80×80へ凝縮したもの。
 * n 人の候補（左の点）から腕（ブレース）が1点に収束し、担当勤務帯（右のターゲット）へ向かう。
 * 収束点のバッジは「最低必要人数 minCount」を表す（＝候補 n のうち minCount 人が入ればよい）。
 * 候補が複数のときは腕を巡回点灯させて「このうち誰か」を表現する（LeaderRuleDiagram と同趣旨）。
 */
import { FC, useMemo } from "react";
import type { SVGProps } from "react";
import styled, { css, keyframes } from "styled-components";
import type { Keyframes } from "styled-components";
import { IconColor } from "./common.js";

type Props = {
  /** 候補者の人数（leaderStaffIds.length） */
  count: number;
  /** 最低必要人数（minCount） */
  minCount: number;
  /** 担当勤務帯の色（早番＝青 など）。腕・収束点・ターゲットに使う。 */
  color: IconColor;
};

const OFF_STROKE = "#d7dde1";
const SLOT_MS = 700;

// 左の候補点の x、収束点、ターゲットの座標（viewBox 80×80）
const DOT_X = 13;
const JOIN_X = 46;
const JOIN_Y = 40;
const TARGET_X = 66;

/** 腕の巡回点灯（1周 = n * SLOT）。on 色は要素側の CSS 変数 --on で受ける。 */
const armBlink = (onPct: number) => keyframes`
  0% { stroke: ${OFF_STROKE}; stroke-width: 1.4px; }
  ${(onPct * 0.15).toFixed(2)}% { stroke: var(--on); stroke-width: 2.6px; }
  ${(onPct * 0.85).toFixed(2)}% { stroke: var(--on); stroke-width: 2.6px; }
  ${onPct.toFixed(2)}% { stroke: ${OFF_STROKE}; stroke-width: 1.4px; }
  100% { stroke: ${OFF_STROKE}; stroke-width: 1.4px; }
`;

const dotBlink = (onPct: number) => keyframes`
  0% { fill: ${OFF_STROKE}; }
  ${(onPct * 0.15).toFixed(2)}% { fill: var(--on); }
  ${(onPct * 0.85).toFixed(2)}% { fill: var(--on); }
  ${onPct.toFixed(2)}% { fill: ${OFF_STROKE}; }
  100% { fill: ${OFF_STROKE}; }
`;

export const LeaderConstraintIcon: FC<Props> = ({ count, minCount, color }) => {
  const n = Math.max(0, count);
  const animated = n > 1;
  const onPct = n > 0 ? 100 / n : 100;
  const armKf = useMemo(() => armBlink(onPct), [onPct]);
  const dotKf = useMemo(() => dotBlink(onPct), [onPct]);
  const durMs = Math.max(1, n) * SLOT_MS;

  // 候補点の y 座標（中心 JOIN_Y のまわりに等間隔で並べる）
  const gap = n > 1 ? Math.min(15, 52 / (n - 1)) : 0;
  const ys = Array.from({ length: n }, (_, i) => JOIN_Y - ((n - 1) * gap) / 2 + i * gap);

  return (
    <svg
      className="e-icon-svg"
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-hidden
    >
      {/* 候補点 → 収束点の腕 */}
      {ys.map((y, i) => {
        const d = `M ${DOT_X} ${y} C ${DOT_X + 18} ${y}, ${JOIN_X - 14} ${JOIN_Y}, ${JOIN_X} ${JOIN_Y}`;
        return (
          <ArmPath
            key={i}
            d={d}
            fill="none"
            strokeLinecap="round"
            style={{ ["--on" as string]: color.fg }}
            $animated={animated}
            $anim={armKf}
            $dur={durMs}
            $delay={i * SLOT_MS}
          />
        );
      })}

      {/* 候補点 */}
      {ys.map((y, i) => (
        <Dot
          key={`d-${i}`}
          cx={DOT_X}
          cy={y}
          r={3.4}
          style={{ ["--on" as string]: color.fg }}
          $animated={animated}
          $anim={dotKf}
          $dur={durMs}
          $delay={i * SLOT_MS}
        />
      ))}

      {n === 0 && (
        <text x={DOT_X} y={JOIN_Y + 4} fontSize="11" fill="#b0bec5" textAnchor="middle">
          0
        </text>
      )}

      {/* 収束点 → ターゲット（常時点灯・勤務帯色） */}
      <path
        d={`M ${JOIN_X} ${JOIN_Y} L ${TARGET_X} ${JOIN_Y}`}
        fill="none"
        stroke={color.fg}
        strokeWidth={2.6}
        strokeLinecap="round"
      />

      {/* ターゲット（担当勤務帯） */}
      <rect
        x={TARGET_X - 7}
        y={JOIN_Y - 9}
        width={16}
        height={18}
        rx={4}
        fill={color.bg}
        stroke={color.fg}
        strokeWidth={1.6}
      />

      {/* 収束点バッジ（最低必要人数 minCount） */}
      <circle cx={JOIN_X} cy={JOIN_Y} r={9} fill={color.fg} />
      <text
        x={JOIN_X}
        y={JOIN_Y + 4}
        fontSize="11"
        fontWeight="700"
        fill="#fff"
        textAnchor="middle"
      >
        {Math.max(1, minCount)}
      </text>
    </svg>
  );
};

const ArmPath = styled.path<
  SVGProps<SVGPathElement> & {
    $animated: boolean;
    $anim: Keyframes;
    $dur: number;
    $delay: number;
  }
>`
  ${({ $animated, $anim, $dur, $delay }) =>
    $animated
      ? css`
          stroke: ${OFF_STROKE};
          stroke-width: 1.4px;
          animation: ${$anim} ${$dur}ms linear ${$delay}ms infinite;
        `
      : css`
          stroke: var(--on);
          stroke-width: 2.6px;
        `}
`;

const Dot = styled.circle<
  SVGProps<SVGCircleElement> & {
    $animated: boolean;
    $anim: Keyframes;
    $dur: number;
    $delay: number;
  }
>`
  ${({ $animated, $anim, $dur, $delay }) =>
    $animated
      ? css`
          fill: ${OFF_STROKE};
          animation: ${$anim} ${$dur}ms linear ${$delay}ms infinite;
        `
      : css`
          fill: var(--on);
        `}
`;
