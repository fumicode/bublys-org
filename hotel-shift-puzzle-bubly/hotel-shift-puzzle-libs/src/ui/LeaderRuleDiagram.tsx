'use client';

import { DragEvent, FC, useMemo, useState } from "react";
import type { CSSProperties, HTMLAttributes, LiHTMLAttributes, SVGProps } from "react";
import styled, { css, keyframes } from "styled-components";
import type { Keyframes } from "styled-components";
import { parseDragPayload } from "@bublys-org/bubbles-ui";
import { ShiftLeaderRule } from "../domain/index.js";
import { leaderRoleStyle } from "./LeaderBadges.js";
import { SHIFT_BG, SHIFT_FG } from "./schedule-grid/constants.js";

type LeaderRuleDiagramProps = {
  /** 描画する宣言的ルール（解決済み。leaderStaffIds が候補者集合） */
  rule: ShiftLeaderRule;
  /** スタッフID → 表示名 */
  nameOf: (staffId: string) => string;
  /**
   * 担当勤務帯の id（例: "early"）。流れ（名前ハイライト・腕・合流点・ターゲット）は
   * 制約の色ではなく「入るべき勤務帯の色」で塗るため、勤務帯 id を受けて SHIFT_BG/FG で色付ける。
   */
  shiftId?: string;
  /**
   * 人（Staff）の URL をドロップしたとき呼ぶ。渡すと図が drop を受け付け、その人を候補に加えられる。
   * dropAcceptTypes と併せて指定する。
   */
  onDropUrl?: (url: string) => void;
  /** 受け付けるドラッグ型（例: Staff の drag type）。 */
  dropAcceptTypes?: string[];
};

// 行のレイアウト寸法（名前カラムと SVG で座標を共有するため JS 側で持つ）
const ROW_H = 30; // 名前チップの高さ
const ROW_GAP = 14; // 行間
const SVG_W = 104; // ブレース部分の幅
const JOIN_X = 72; // 候補者の腕が合流する点（ブレースの先端）の x
const SLOT_MS = 700; // 1本あたりの点灯スロット（巡回1周 = n * SLOT）

const OFF_STROKE = "#d7dde1";
const NAME_OFF = { bg: "#fff", fg: "#546e7a", border: "#dfe4e7" };

/**
 * 巡回ハイライトは CSS `@keyframes` で行う（JS の setInterval/再レンダーだとフレームが
 * 不規則でガクつくため）。1スロット（duration の 1/n）の中で「フェードイン→点灯→フェード
 * アウト」し、各腕/名前を animation-delay で 1 スロットずつずらして順に光らせる。
 * on の値は要素側の CSS 変数（--on / --on-bg …）で受けるので、ロール色ごとに使い回せる。
 */
const armBlink = (onPct: number) => keyframes`
  0% { stroke: ${OFF_STROKE}; stroke-width: 1.4px; }
  ${(onPct * 0.15).toFixed(3)}% { stroke: var(--on); stroke-width: 2.6px; }
  ${(onPct * 0.85).toFixed(3)}% { stroke: var(--on); stroke-width: 2.6px; }
  ${onPct.toFixed(3)}% { stroke: ${OFF_STROKE}; stroke-width: 1.4px; }
  100% { stroke: ${OFF_STROKE}; stroke-width: 1.4px; }
`;

const nameBlink = (onPct: number) => keyframes`
  0% { background: ${NAME_OFF.bg}; color: ${NAME_OFF.fg}; border-color: ${NAME_OFF.border}; }
  ${(onPct * 0.15).toFixed(3)}% { background: var(--on-bg); color: var(--on-fg); border-color: var(--on-border); }
  ${(onPct * 0.85).toFixed(3)}% { background: var(--on-bg); color: var(--on-fg); border-color: var(--on-border); }
  ${onPct.toFixed(3)}% { background: ${NAME_OFF.bg}; color: ${NAME_OFF.fg}; border-color: ${NAME_OFF.border}; }
  100% { background: ${NAME_OFF.bg}; color: ${NAME_OFF.fg}; border-color: ${NAME_OFF.border}; }
`;

/**
 * 責任者ルールを「OR（このうち誰か一人はいなければならない）」としてビジュアル化する図。
 * 候補者を縦に並べ、各候補者から合流点へ伸びる腕（ブレース `}`）で束ね、その先を勤務帯へつなぐ。
 * 純粋な表示：ShiftLeaderRule だけから導出する（特定の稼働日の割当には依存しない）。
 */
export const LeaderRuleDiagram: FC<LeaderRuleDiagramProps> = ({
  rule,
  nameOf,
  shiftId,
  onDropUrl,
  dropAcceptTypes,
}) => {
  const ids = rule.leaderStaffIds;
  const n = ids.length;
  const animated = n > 1;

  // 人（Staff）をドロップして候補に追加する drop ゾーン。
  const [dragOver, setDragOver] = useState(false);
  const droppable = !!onDropUrl;
  const handleDragOver = (e: DragEvent) => {
    if (!onDropUrl) return;
    // dragover 中はブラウザのセキュリティ制約で getData() が空を返すため、payload は読めない。
    // 受け入れ可否は dataTransfer.types（型キーだけは読める）で判定する。
    const types = Array.from(e.dataTransfer.types);
    if (!(dropAcceptTypes ?? []).some((t) => types.includes(t))) return;
    e.preventDefault(); // drop を許可
    e.dataTransfer.dropEffect = "copy";
    if (!dragOver) setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    const payload = parseDragPayload(e, { acceptTypes: dropAcceptTypes });
    if (!payload || !onDropUrl) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onDropUrl(payload.url);
  };

  // 流れの色 = 入るべき勤務帯の色（早番＝青 …）。制約（早責/予責/夜責）の色ではない。
  const shiftBg = (shiftId && SHIFT_BG[shiftId]) || "#eceff1";
  const shiftFg = (shiftId && SHIFT_FG[shiftId]) || "#455a64";
  const shiftBorder = `${shiftFg}59`; // 勤務帯色の半透明ボーダー
  const shiftBadgeStyle = {
    background: shiftBg,
    color: shiftFg,
    border: `1px solid ${shiftBorder}`,
  };

  const onPct = n > 0 ? 100 / n : 100;
  const armKf = useMemo(() => armBlink(onPct), [onPct]);
  const nameKf = useMemo(() => nameBlink(onPct), [onPct]);
  const durMs = Math.max(1, n) * SLOT_MS;

  const svgH = Math.max(ROW_H, n * ROW_H + (n - 1) * ROW_GAP);
  const midY = svgH / 2;
  const rowCenterY = (i: number) => i * (ROW_H + ROW_GAP) + ROW_H / 2;

  const quota =
    rule.minCount <= 1
      ? "誰か一人はいなければならない"
      : `最低${rule.minCount}人はいなければならない`;

  return (
    <StyledDiagram
      className={droppable && dragOver ? "is-dragover" : undefined}
      style={droppable ? ({ "--drop-accent": shiftFg } as CSSProperties) : undefined}
      onDragOver={droppable ? handleDragOver : undefined}
      onDragLeave={droppable ? handleDragLeave : undefined}
      onDrop={droppable ? handleDrop : undefined}
    >
      <div className="e-head">
        <span className="e-chip" style={leaderRoleStyle(rule.key)}>
          {rule.label}
        </span>
        <span className="e-cond">
          「{rule.shiftName}」に <strong>{quota}</strong>
        </span>
      </div>

      <div className="e-body">
        <ul className="e-names" style={{ gap: ROW_GAP }}>
          {n === 0 && <li className="e-name-empty">（該当者なし）</li>}
          {ids.map((id, i) => (
            <NameItem
              key={id}
              $animated={animated}
              $anim={nameKf}
              $dur={durMs}
              $delay={i * SLOT_MS}
              $onBg={shiftBg}
              $onFg={shiftFg}
              $onBorder={shiftBorder}
            >
              {nameOf(id)}
            </NameItem>
          ))}
        </ul>

        <svg
          className="e-brace"
          width={SVG_W}
          height={svgH}
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          aria-hidden
        >
          {ids.map((id, i) => {
            const y = rowCenterY(i);
            const d = `M 0 ${y} C ${JOIN_X * 0.55} ${y}, ${JOIN_X * 0.55} ${midY}, ${JOIN_X} ${midY}`;
            return (
              <ArmPath
                key={id}
                d={d}
                fill="none"
                strokeLinecap="round"
                style={{ ["--on" as string]: shiftFg }}
                $animated={animated}
                $anim={armKf}
                $dur={durMs}
                $delay={i * SLOT_MS}
              />
            );
          })}
          {/* 合流点 → 右端（勤務帯へ）。常時点灯。勤務帯の色。 */}
          <path
            d={`M ${JOIN_X} ${midY} L ${SVG_W} ${midY}`}
            fill="none"
            stroke={shiftFg}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <circle cx={JOIN_X} cy={midY} r={3.5} fill={shiftFg} />
        </svg>

        <div className="e-target">
          <span className="e-leader-badge" style={shiftBadgeStyle}>
            {rule.shiftName}
          </span>
        </div>
      </div>

      {droppable && (
        <div className="e-drop-hint">＋ ここに人をドロップで候補に追加</div>
      )}
    </StyledDiagram>
  );
};

/** 候補者チップ。animated のときは CSS keyframes で巡回点灯、単独のときは静的に点灯。 */
const NameItem = styled.li<
  LiHTMLAttributes<HTMLLIElement> & {
    $animated: boolean;
    $anim: Keyframes;
    $dur: number;
    $delay: number;
    $onBg: string;
    $onFg: string;
    $onBorder: string;
  }
>`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: ${ROW_H}px;
  padding: 0 10px;
  border-radius: 6px;
  white-space: nowrap;
  font-weight: 600;
  --on-bg: ${({ $onBg }) => $onBg};
  --on-fg: ${({ $onFg }) => $onFg};
  --on-border: ${({ $onBorder }) => $onBorder};
  ${({ $animated, $anim, $dur, $delay, $onBg, $onFg, $onBorder }) =>
    $animated
      ? css`
          background: ${NAME_OFF.bg};
          color: ${NAME_OFF.fg};
          border: 1px solid ${NAME_OFF.border};
          animation: ${$anim} ${$dur}ms linear ${$delay}ms infinite;
        `
      : css`
          background: ${$onBg};
          color: ${$onFg};
          border: 1px solid ${$onBorder};
        `}
`;

/** 候補者→合流点の腕。animated のときは CSS keyframes で巡回点灯、単独のときは静的に点灯。 */
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

const StyledDiagram = styled.div<HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  outline: 2px dashed transparent;
  outline-offset: -4px;
  transition: outline-color 0.12s ease, background 0.12s ease;

  /* 人をドラッグして上に乗せているときの受け入れハイライト（勤務帯色） */
  &.is-dragover {
    outline-color: var(--drop-accent, #90a4ae);
    background: color-mix(in srgb, var(--drop-accent, #90a4ae) 8%, transparent);
  }

  .e-drop-hint {
    margin-top: 2px;
    font-size: 0.78em;
    color: #90a4ae;
    border-top: 1px dashed #e0e4e7;
    padding-top: 8px;
  }
  font-size: 0.86em;
  color: #37474f;

  .e-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .e-chip {
    flex-shrink: 0;
    font-weight: bold;
    line-height: 1;
    padding: 3px 7px;
    border-radius: 4px;
  }
  .e-cond strong {
    color: #263238;
  }

  .e-body {
    display: flex;
    align-items: center;
  }

  .e-names {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }
  .e-name-empty {
    display: flex;
    align-items: center;
    height: ${ROW_H}px;
    padding: 0 10px;
    border: 1px dashed #dfe4e7;
    border-radius: 6px;
    color: #9e9e9e;
  }

  .e-target {
    display: flex;
    align-items: center;
  }
  .e-leader-badge {
    font-weight: bold;
    line-height: 1;
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 1.05em;
  }
`;
