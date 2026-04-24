'use client';

import React, { FC } from 'react';
import styled from 'styled-components';
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
};

// ========== コンポーネント ==========

export const CoverageTetrisView: FC<CoverageTetrisViewProps> = ({
  blockCoverages,
  requiredCount,
  memberNameMap,
  density = 'compact',
  onExpand,
}) => {
  // 表示する最大段数：必要人数 + 実最大超過人数（余剰も可視化）
  const maxCount = blockCoverages.reduce((m, c) => Math.max(m, c.count), 0);
  const displayHeight = Math.max(requiredCount, maxCount, 1);

  // 各ブロック × 段(row)の所属メンバーを決める：
  // そのブロックに配置されたメンバーを「下から順に」積む
  const grid: (string | null)[][] = []; // grid[row][blockIdx] = memberId | null
  for (let r = 0; r < displayHeight; r++) grid.push(Array(blockCoverages.length).fill(null));
  blockCoverages.forEach((c, bi) => {
    c.userIds.forEach((uid, stackIndex) => {
      if (stackIndex < displayHeight) grid[stackIndex][bi] = uid;
    });
  });

  const blockPx = density === 'full' ? 32 : 16;
  const rowPx = density === 'full' ? 28 : 16;

  // 必要ラインのY位置：下から requiredCount 段目の上端
  const requiredLineBottomPx = requiredCount * rowPx;

  // メンバー毎に安定した色を割り当てる（単純ハッシュ）
  const colorFor = (uid: string) => {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) % 360;
    return `hsl(${h}, 55%, 68%)`;
  };

  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  return (
    <StyledTetris $density={density}>
      <div className="tt-header">
        <span className="tt-title">人数充足ビュー</span>
        <span className="tt-required">必要: {requiredCount}名</span>
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
        {/* セル（下から積む。row=0が最下段） */}
        {grid.map((rowCells, row) =>
          rowCells.map((uid, bi) => {
            const isOverRequired = row >= requiredCount;
            return (
              <div
                key={`${row}-${bi}`}
                className={`tt-cell ${uid ? 'is-filled' : ''} ${isOverRequired && uid ? 'is-over' : ''}`}
                style={{
                  left: bi * blockPx,
                  bottom: row * rowPx,
                  width: blockPx,
                  height: rowPx,
                  background: uid ? colorFor(uid) : undefined,
                }}
                title={uid ? `${memberNameMap.get(uid) ?? uid} @ ${fmt(blockCoverages[bi].minute)}` : undefined}
              >
                {density === 'full' && uid && (
                  <span className="tt-cell-label">{(memberNameMap.get(uid) ?? uid).slice(0, 2)}</span>
                )}
              </div>
            );
          }),
        )}

        {/* 不足セル（requiredライン未満 & そのrowが空） */}
        {blockCoverages.map((c, bi) => {
          const shortage = Math.max(0, requiredCount - c.count);
          if (shortage === 0) return null;
          return Array.from({ length: shortage }, (_, i) => {
            const row = c.count + i;
            return (
              <div
                key={`short-${row}-${bi}`}
                className="tt-cell is-short"
                style={{
                  left: bi * blockPx,
                  bottom: row * rowPx,
                  width: blockPx,
                  height: rowPx,
                }}
                title={`不足 ${fmt(c.minute)}-${fmt(c.minute + 15)}（${c.count}/${requiredCount}）`}
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
            const showLabel = c.minute % 60 === 0; // 毎正時のみ
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

  .tt-chart {
    position: relative;
    background: #fafafa;
    border: 1px solid #ddd;
  }

  .tt-cell {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62em;
    color: rgba(0, 0, 0, 0.6);
    &.is-over { opacity: 0.55; border-style: dashed; }
    &.is-short {
      background: repeating-linear-gradient(
        45deg,
        #ffcccc,
        #ffcccc 4px,
        #ff8888 4px,
        #ff8888 8px
      );
      border-color: #d32f2f;
    }
  }

  .tt-cell-label {
    pointer-events: none;
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
`;
