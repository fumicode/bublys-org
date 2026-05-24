'use client';

import React, { FC } from 'react';
import styled from 'styled-components';
import { ObjectView } from '@bublys-org/bubbles-ui';
import { type BlockCoverage } from '../domain/index.js';

// ========== 型定義 ==========

export type CoverageTetrisViewProps = {
  /** shift の有効範囲のブロックのみを渡す */
  blockCoverages: readonly BlockCoverage[];
  requiredCount: number;
  /** 配置メンバーID → 表示名（ツールチップ用） */
  memberNameMap: ReadonlyMap<string, string>;
  /** 密度。'compact' はカード内表示、'full' は拡大表示用 */
  density?: 'compact' | 'full';
  /** 右上の「拡大」コールバック（カード時のみ） */
  onExpand?: () => void;
  /** 配置セルを ObjectView bubbleLink として展開するための URL ビルダー */
  buildMemberUrl?: (memberId: string) => string;
  /** 配置セルクリック時のコールバック（メンバーバブル展開用） */
  onMemberClick?: (memberId: string) => void;
  /** エラーメンバーID → 違反メッセージ一覧（非スタブのみ）。full 密度時にリスト表示 */
  memberViolations?: ReadonlyMap<string, readonly string[]>;
};

/** 同じ uid が連続するブロックをスパンにまとめる */
type Span = { uid: string | null; start: number; len: number };
function toSpans(cells: (string | null)[]): Span[] {
  const spans: Span[] = [];
  let i = 0;
  while (i < cells.length) {
    const uid = cells[i];
    let j = i + 1;
    while (j < cells.length && cells[j] === uid) j++;
    spans.push({ uid, start: i, len: j - i });
    i = j;
  }
  return spans;
}

// ========== コンポーネント ==========

export const CoverageTetrisView: FC<CoverageTetrisViewProps> = ({
  blockCoverages,
  requiredCount,
  memberNameMap,
  density = 'compact',
  onExpand,
  buildMemberUrl,
  onMemberClick,
  memberViolations,
}) => {
  // 表示する最大段数：必要人数 + 実最大超過人数（余剰も可視化）
  const maxCount = blockCoverages.reduce((m, c) => Math.max(m, c.count), 0);
  const displayHeight = Math.max(requiredCount, maxCount, 1);

  // 各ブロック × 段(row)の所属メンバーを決める
  const grid: (string | null)[][] = [];
  for (let r = 0; r < displayHeight; r++) grid.push(Array(blockCoverages.length).fill(null));
  blockCoverages.forEach((c, bi) => {
    c.userIds.forEach((uid, stackIndex) => {
      if (stackIndex < displayHeight) grid[stackIndex][bi] = uid;
    });
  });

  // エラーメンバーIDセット（全ブロックの errorUserIds を集約）
  const errorMemberIds = new Set(blockCoverages.flatMap((c) => c.errorUserIds ?? []));
  const totalErrorCount = blockCoverages.some((c) => (c.errorUserIds?.length ?? 0) > 0)
    ? [...new Set(blockCoverages.flatMap((c) => c.errorUserIds ?? []))].length
    : 0;

  const blockPx = density === 'full' ? 20 : 10;
  const rowPx = density === 'full' ? 22 : 14;

  const requiredLineBottomPx = requiredCount * rowPx;

  const colorFor = (uid: string) => {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) % 360;
    return `hsl(${h}, 55%, 68%)`;
  };

  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  return (
    <StyledTetris $density={density}>
      <div className="tt-header">
        <span className="tt-title">人数充足ビュー</span>
        <span className="tt-required">必要: {requiredCount}名</span>
        {totalErrorCount > 0 && (
          <span className="tt-error-badge">⚠ {totalErrorCount}名エラー</span>
        )}
        {onExpand && (
          <button className="tt-expand" onClick={onExpand} aria-label="拡大">
            ↗
          </button>
        )}
      </div>

      <div
        className="tt-chart"
        style={{
          height: displayHeight * rowPx,
          width: blockCoverages.length * blockPx,
        }}
      >
        {/* 通常セル：同名連続ブロックをマージして幅広セルに */}
        {grid.map((rowCells, row) =>
          toSpans(rowCells).map(({ uid, start, len }) => {
            if (!uid) return null; // 空セルは不描画
            const isOverRequired = row >= requiredCount;
            const isError = errorMemberIds.has(uid);
            const w = len * blockPx;
            const startMin = blockCoverages[start]?.minute;
            const endMin = blockCoverages[start + len - 1]?.minute;
            const label = memberNameMap.get(uid) ?? uid;
            const baseTitle =
              startMin != null && endMin != null
                ? `${label}  ${fmt(startMin)}–${fmt(endMin + 15)}`
                : label;
            const violations = isError ? memberViolations?.get(uid) : undefined;
            const titleText = violations?.length
              ? `${baseTitle}\n⚠ ${violations.join('\n⚠ ')}`
              : baseTitle;
            return (
              <div
                key={`${row}-${start}`}
                className={`tt-cell is-filled ${isOverRequired ? 'is-over' : ''} ${isError ? 'is-error' : ''}`}
                style={{
                  left: start * blockPx,
                  bottom: row * rowPx,
                  width: w,
                  height: rowPx,
                  background: isError ? undefined : colorFor(uid),
                  cursor: buildMemberUrl || onMemberClick ? 'pointer' : undefined,
                }}
                title={titleText}
                onClick={!buildMemberUrl && onMemberClick ? () => onMemberClick(uid) : undefined}
              >
                {buildMemberUrl && (
                  <ObjectView
                    type="Member"
                    url={buildMemberUrl(uid)}
                    label={label}
                    draggable
                    onClick={() => onMemberClick?.(uid)}
                  >
                    <span className="tt-cell-overlay" />
                  </ObjectView>
                )}
                {density === 'full' && (
                  <span className="tt-cell-label">{label}</span>
                )}
              </div>
            );
          })
        )}

        {/* 不足セル：validCount < requiredCount の行（エラーセルで埋まっている行は除く） */}
        {Array.from({ length: requiredCount }, (_, row) => {
          const shortSpans: { start: number; len: number }[] = [];
          let spanStart = -1;
          for (let bi = 0; bi <= blockCoverages.length; bi++) {
            const c = bi < blockCoverages.length ? blockCoverages[bi] : null;
            // validCount未満かつ grid[row][bi] が null（エラーセルでも埋まっていない）
            const inShortage = c !== null && row >= (c.validCount ?? c.count) && grid[row]?.[bi] === null;
            if (inShortage && spanStart === -1) {
              spanStart = bi;
            } else if (!inShortage && spanStart !== -1) {
              shortSpans.push({ start: spanStart, len: bi - spanStart });
              spanStart = -1;
            }
          }
          return shortSpans.map(({ start, len }) => {
            const startMin = blockCoverages[start]?.minute;
            const endMin = blockCoverages[start + len - 1]?.minute;
            const c = blockCoverages[start];
            const validCount = c?.validCount ?? c?.count ?? 0;
            return (
              <div
                key={`short-${row}-${start}`}
                className="tt-cell is-short"
                style={{
                  left: start * blockPx,
                  bottom: row * rowPx,
                  width: len * blockPx,
                  height: rowPx,
                }}
                title={
                  startMin != null && endMin != null
                    ? `不足 ${fmt(startMin)}–${fmt(endMin + 15)}（有効${validCount}/${requiredCount}）`
                    : undefined
                }
              />
            );
          });
        })}

        {/* 必要ライン */}
        <div
          className="tt-required-line"
          style={{
            bottom: requiredLineBottomPx,
            width: blockCoverages.length * blockPx,
          }}
        />
      </div>

      {/* 時刻ラベル（fullのみ。要所のみ） */}
      {density === 'full' && blockCoverages.length > 0 && (
        <div className="tt-axis" style={{ width: blockCoverages.length * blockPx }}>
          {blockCoverages.map((c, bi) => {
            const showLabel = c.minute % 60 === 0;
            return (
              <span
                key={bi}
                className="tt-tick"
                style={{ left: bi * blockPx, width: blockPx }}
              >
                {showLabel ? fmt(c.minute) : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* エラー詳細リスト（full 密度かつエラーあり） */}
      {density === 'full' && memberViolations && memberViolations.size > 0 && (
        <div className="tt-error-list">
          <div className="tt-error-list-title">エラー詳細</div>
          {[...memberViolations.entries()].map(([uid, messages]) => (
            <div key={uid} className="tt-error-item">
              <span className="tt-error-name">{memberNameMap.get(uid) ?? uid}</span>
              <ul className="tt-error-messages">
                {messages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </StyledTetris>
  );
};

// ========== スタイル ==========

type StyledTetrisProps = React.HTMLAttributes<HTMLDivElement> & {
  $density: 'compact' | 'full';
};
const StyledTetris = styled.div<StyledTetrisProps>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${(p) => (p.$density === 'full' ? '12px' : '8px')};

  .tt-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82em;
  }
  .tt-title {
    font-weight: 600;
    color: #333;
  }
  .tt-required {
    color: #666;
  }
  .tt-expand {
    margin-left: auto;
    padding: 2px 6px;
    border: 1px solid #ccc;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
    &:hover { background: #f5f5f5; }
  }
  .tt-error-badge {
    color: #c62828;
    font-size: 0.8em;
    font-weight: 600;
  }

  .tt-chart {
    position: relative;
    background: #fafafa;
    border: 1px solid #ddd;
  }

  .tt-cell {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.58em;
    color: rgba(0, 0, 0, 0.65);
    overflow: hidden;
    &.is-over { opacity: 0.55; border-style: dashed; }
    &.is-error {
      background: repeating-linear-gradient(
        45deg,
        #ffcdd2,
        #ffcdd2 4px,
        #ef9a9a 4px,
        #ef9a9a 8px
      );
      border-color: #c62828;
      border-style: dashed;
    }
    &.is-short {
      background: repeating-linear-gradient(
        45deg,
        #ffcccc,
        #ffcccc 4px,
        #ff8888 4px,
        #ff8888 8px
      );
      border-color: #d32f2f;
      border-radius: 0;
    }
  }

  .tt-cell-overlay {
    position: absolute;
    inset: 0;
    display: block;
  }

  .tt-cell-label {
    pointer-events: none;
    position: relative;
    z-index: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    padding: 0 3px;
  }

  .tt-required-line {
    position: absolute;
    left: 0;
    height: 0;
    border-top: 2px solid #1976d2;
    pointer-events: none;
  }

  .tt-axis {
    position: relative;
    height: 14px;
  }
  .tt-tick {
    position: absolute;
    bottom: 0;
    font-size: 0.62em;
    color: #666;
  }

  .tt-error-list {
    border: 1px solid #ef9a9a;
    border-radius: 4px;
    background: #fff8f8;
    padding: 6px 8px;
    font-size: 0.82em;
  }
  .tt-error-list-title {
    font-weight: 600;
    color: #c62828;
    margin-bottom: 4px;
  }
  .tt-error-item {
    margin-bottom: 4px;
    &:last-child { margin-bottom: 0; }
  }
  .tt-error-name {
    font-weight: 600;
    color: #333;
  }
  .tt-error-messages {
    margin: 2px 0 0 0;
    padding-left: 16px;
    color: #555;
    li { margin-bottom: 1px; }
  }
`;
