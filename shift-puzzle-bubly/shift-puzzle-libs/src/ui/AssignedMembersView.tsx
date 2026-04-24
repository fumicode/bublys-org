'use client';

import React, { FC } from 'react';
import styled from 'styled-components';
import { ObjectView } from '@bublys-org/bubbles-ui';
import PersonIcon from '@mui/icons-material/Person';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
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

  /** 局員バブル展開用 */
  buildMemberUrl?: (memberId: string) => string;
  onMemberClick?: (memberId: string) => void;
  /** 参加可能シフトバブル展開用 */
  buildAvailabilityUrl?: (memberId: string) => string;
  onAvailabilityClick?: (memberId: string) => void;
};

// ========== 違反カテゴリ → 表示情報 ==========
// department はユーザー要望で違反として出さないため除外

const CATEGORY_LABEL: Partial<Record<AssignmentViolationCategory, string>> = {
  availability: '参加不可',
  taskConflict: '時間競合',
  noLeader: '指揮不在',
  skill: 'スキル',
  workHours: '勤務時間',
  breakTime: '休憩時間',
};

const CATEGORY_ICON: Partial<Record<AssignmentViolationCategory, string>> = {
  availability: '🚫',
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
  buildMemberUrl,
  onMemberClick,
  buildAvailabilityUrl,
  onAvailabilityClick,
}) => {
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const renderCategory = (v: AssignmentViolation) => {
    const label = CATEGORY_LABEL[v.category];
    const icon = CATEGORY_ICON[v.category];
    if (!label) return null;
    return (
      <div
        key={`${v.category}-${v.message}`}
        className={`am-violation ${v.isStub ? 'am-violation--stub' : ''}`}
      >
        <span className="am-violation-icon">{icon}</span>
        <span className="am-violation-label">{label}</span>
        <span className="am-violation-msg">{v.message}</span>
      </div>
    );
  };

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
          {shiftViolations.map((v, i) => {
            const label = CATEGORY_LABEL[v.category];
            const icon = CATEGORY_ICON[v.category];
            if (!label) return null;
            return (
              <div key={i} className="am-violation am-violation--shift">
                <span className="am-violation-icon">{icon}</span>
                <span className="am-violation-label">{label}</span>
                <span className="am-violation-msg">{v.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {memberSummaries.length === 0 ? (
        <div className="am-empty">配置されていません</div>
      ) : (
        <ul className="am-list">
          {memberSummaries.map((s) => {
            const realViolations = s.violations.filter(
              (v) => !v.isStub && v.category !== 'department' && CATEGORY_LABEL[v.category],
            );
            const stubViolations = s.violations.filter((v) => v.isStub && CATEGORY_LABEL[v.category]);

            const memberUrl = buildMemberUrl?.(s.memberId);
            const availabilityUrl = buildAvailabilityUrl?.(s.memberId);

            return (
              <li
                key={s.memberId}
                className={`am-item ${realViolations.length > 0 ? 'has-violation' : ''}`}
              >
                <div className="am-row-main">
                  {memberUrl ? (
                    <ObjectView
                      type="Member"
                      url={memberUrl}
                      label={s.memberName}
                      draggable
                      onClick={() => onMemberClick?.(s.memberId)}
                    >
                      <span className="am-name am-name--link">
                        <PersonIcon fontSize="inherit" className="am-name-icon" />
                        {s.memberName}
                        {s.isNewMember && <span className="am-new">新</span>}
                      </span>
                    </ObjectView>
                  ) : (
                    <span className="am-name">
                      <PersonIcon fontSize="inherit" className="am-name-icon" />
                      {s.memberName}
                      {s.isNewMember && <span className="am-new">新</span>}
                    </span>
                  )}

                  <span className="am-dept">{s.department}</span>

                  <span className="am-runs">
                    {s.runs.map((r, i) => (
                      <span key={i} className="am-run">
                        {fmt(r.startMinute)}–{fmt(r.endMinute)}
                      </span>
                    ))}
                  </span>

                  {availabilityUrl && (
                    <ObjectView
                      type="MemberAvailability"
                      url={availabilityUrl}
                      label={`${s.memberName}の参加可能時間帯`}
                      draggable
                      onClick={() => onAvailabilityClick?.(s.memberId)}
                    >
                      <button
                        type="button"
                        className="am-availability-btn"
                        aria-label={`${s.memberName}の参加可能時間帯を開く`}
                      >
                        <EventAvailableIcon fontSize="inherit" />
                      </button>
                    </ObjectView>
                  )}
                </div>

                {realViolations.length > 0 && (
                  <div className="am-row-violations">
                    {realViolations.map(renderCategory)}
                  </div>
                )}

                {density === 'full' && stubViolations.length > 0 && (
                  <div className="am-row-violations am-row-violations--stub">
                    {stubViolations.map(renderCategory)}
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
    padding: 6px 10px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    font-size: 0.82em;
    transition: border-color 0.15s, background-color 0.15s;

    &:hover {
      border-color: #b0bec5;
      background: #fafafa;
    }
    &.has-violation {
      border-color: #ef9a9a;
      background: #fff7f7;
      &:hover { background: #fff1f1; }
    }
  }

  .am-row-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .am-name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    color: #333;
    flex-shrink: 0;
  }
  .am-name--link {
    cursor: grab;
    &:hover { color: #1565c0; }
  }
  .am-name-icon {
    color: #90a4ae;
    font-size: 1.1em;
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
    color: #667c8a;
    font-size: 0.85em;
    padding: 1px 6px;
    background: #eceff1;
    border-radius: 8px;
    white-space: nowrap;
  }
  .am-runs {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-left: auto;
  }
  .am-run {
    padding: 1px 6px;
    background: #f0f0f0;
    border-radius: 10px;
    font-size: 0.85em;
    color: #555;
    font-variant-numeric: tabular-nums;
  }
  .am-availability-btn {
    padding: 2px 6px;
    border: 1px solid #cfd8dc;
    border-radius: 4px;
    background: #fff;
    color: #546e7a;
    cursor: grab;
    display: inline-flex;
    align-items: center;
    font-size: 0.95em;
    &:hover {
      background: #e3f2fd;
      color: #1565c0;
      border-color: #90caf9;
    }
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
