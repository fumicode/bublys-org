'use client';

import React, { FC } from 'react';
import styled from 'styled-components';
import {
  type AssignmentViolation,
  type MemberAssignmentSummary,
  type AssignmentViolationCategory,
} from '../domain/index.js';

// ========== 型定義 ==========

export type AssignedMembersViewProps = {
  memberSummaries: readonly MemberAssignmentSummary[];
  /** Shift単位の違反（経験者不在など） */
  shiftViolations: readonly AssignmentViolation[];
  density?: 'compact' | 'full';
  onExpand?: () => void;
};

// ========== 違反カテゴリ → 表示情報 ==========

const CATEGORY_LABEL: Record<AssignmentViolationCategory, string> = {
  availability: '参加不可',
  department: '担当局',
  taskConflict: '時間競合',
  noLeader: '指揮不在',
  skill: 'スキル',
  workHours: '勤務時間',
  breakTime: '休憩時間',
};

const CATEGORY_ICON: Record<AssignmentViolationCategory, string> = {
  availability: '🚫',
  department: '🏷',
  taskConflict: '⚔',
  noLeader: '👑',
  skill: '🛠',
  workHours: '⏱',
  breakTime: '☕',
};

// ========== コンポーネント ==========

export const AssignedMembersView: FC<AssignedMembersViewProps> = ({
  memberSummaries,
  shiftViolations,
  density = 'compact',
  onExpand,
}) => {
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  return (
    <StyledList $density={density}>
      <div className="am-header">
        <span className="am-title">配置メンバー</span>
        <span className="am-count">{memberSummaries.length}名</span>
        {onExpand && (
          <button className="am-expand" onClick={onExpand} aria-label="拡大">
            ↗
          </button>
        )}
      </div>

      {shiftViolations.length > 0 && (
        <div className="am-shift-violations">
          {shiftViolations.map((v, i) => (
            <div key={i} className="am-violation am-violation--shift">
              <span className="am-violation-icon">{CATEGORY_ICON[v.category]}</span>
              <span className="am-violation-label">{CATEGORY_LABEL[v.category]}</span>
              <span className="am-violation-msg">{v.message}</span>
            </div>
          ))}
        </div>
      )}

      {memberSummaries.length === 0 ? (
        <div className="am-empty">配置されていません</div>
      ) : (
        <ul className="am-list">
          {memberSummaries.map((s) => {
            const realViolations = s.violations.filter((v) => !v.isStub);
            const stubViolations = s.violations.filter((v) => v.isStub);
            return (
              <li key={s.memberId} className={`am-item ${realViolations.length > 0 ? 'has-violation' : ''}`}>
                <div className="am-row-main">
                  <span className="am-name">
                    {s.memberName}
                    {s.isNewMember && <span className="am-new">新</span>}
                  </span>
                  <span className="am-dept">{s.department}</span>
                  <span className="am-runs">
                    {s.runs.map((r, i) => (
                      <span key={i} className="am-run">
                        {fmt(r.startMinute)}–{fmt(r.endMinute)}
                      </span>
                    ))}
                  </span>
                </div>

                {realViolations.length > 0 && (
                  <div className="am-row-violations">
                    {realViolations.map((v, i) => (
                      <div key={i} className="am-violation">
                        <span className="am-violation-icon">{CATEGORY_ICON[v.category]}</span>
                        <span className="am-violation-label">{CATEGORY_LABEL[v.category]}</span>
                        <span className="am-violation-msg">{v.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {density === 'full' && stubViolations.length > 0 && (
                  <div className="am-row-violations am-row-violations--stub">
                    {stubViolations.map((v, i) => (
                      <div key={i} className="am-violation am-violation--stub">
                        <span className="am-violation-icon">{CATEGORY_ICON[v.category]}</span>
                        <span className="am-violation-label">{CATEGORY_LABEL[v.category]}</span>
                        <span className="am-violation-msg">{v.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </StyledList>
  );
};

// ========== スタイル ==========

type StyledListProps = React.HTMLAttributes<HTMLDivElement> & {
  $density: 'compact' | 'full';
};
const StyledList = styled.div<StyledListProps>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${(p) => (p.$density === 'full' ? '12px' : '8px')};

  .am-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82em;
  }
  .am-title { font-weight: 600; color: #333; }
  .am-count { color: #666; }
  .am-expand {
    margin-left: auto;
    padding: 2px 6px;
    border: 1px solid #ccc;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
    &:hover { background: #f5f5f5; }
  }

  .am-shift-violations {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .am-empty {
    padding: 8px;
    color: #999;
    font-size: 0.82em;
    text-align: center;
  }

  .am-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .am-item {
    padding: 6px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #fff;
    font-size: 0.82em;
    &.has-violation {
      border-color: #ef5350;
      background: #fff5f5;
    }
  }

  .am-row-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .am-name {
    font-weight: 600;
    color: #333;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .am-new {
    padding: 0 4px;
    background: #ffe082;
    color: #6d4c00;
    border-radius: 2px;
    font-size: 0.75em;
    font-weight: 600;
  }
  .am-dept {
    color: #666;
    font-size: 0.88em;
  }
  .am-runs {
    margin-left: auto;
    display: inline-flex;
    gap: 4px;
  }
  .am-run {
    padding: 1px 6px;
    background: #f0f0f0;
    border-radius: 10px;
    font-size: 0.88em;
    color: #555;
  }

  .am-row-violations {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .am-row-violations--stub {
    opacity: 0.55;
  }

  .am-violation {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    background: #ffebee;
    border-left: 3px solid #ef5350;
    border-radius: 2px;
    font-size: 0.82em;
    color: #b71c1c;

    &--shift {
      border-left-color: #ff9800;
      background: #fff3e0;
      color: #e65100;
    }
    &--stub {
      border-left-color: #bdbdbd;
      background: #f5f5f5;
      color: #757575;
    }
  }
  .am-violation-icon { font-size: 1em; }
  .am-violation-label {
    font-weight: 600;
    font-size: 0.88em;
  }
  .am-violation-msg {
    font-size: 0.88em;
  }
`;
