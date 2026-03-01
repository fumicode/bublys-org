'use client';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import type {
  AssignmentState,
  MemberState,
  RoleState,
  TimeSlotState,
  ReasonCategory,
} from '@bublys-org/shift-puzzle-model';
import { AssignmentReason } from '@bublys-org/shift-puzzle-model';

export interface ReasonListProps {
  assignments: AssignmentState[];
  memberMap: Map<string, MemberState>;
  roleMap: Map<string, RoleState>;
  timeSlotMap: Map<string, TimeSlotState>;
}

const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  skill_match:   'スキル適合',
  training:      '育成目的',
  compatibility: '相性考慮',
  availability:  '空き時間調整',
  other:         'その他',
};

const CATEGORY_COLORS: Record<ReasonCategory, { bg: string; text: string }> = {
  skill_match:   { bg: '#e8f5e9', text: '#2e7d32' },
  training:      { bg: '#fff3e0', text: '#e65100' },
  compatibility: { bg: '#fce4ec', text: '#880e4f' },
  availability:  { bg: '#e3f2fd', text: '#1565c0' },
  other:         { bg: '#f5f5f5', text: '#616161' },
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** F-3-3: 配置理由一覧ビュー（引き継ぎドキュメント代替） */
export const ReasonList: React.FC<ReasonListProps> = ({
  assignments,
  memberMap,
  roleMap,
  timeSlotMap,
}) => {
  const [filterCategory, setFilterCategory] = useState<ReasonCategory | 'all'>('all');
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (filterCategory !== 'all' && a.reason.category !== filterCategory) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const memberName = memberMap.get(a.memberId)?.name ?? '';
        const roleName = roleMap.get(a.roleId)?.name ?? '';
        if (
          !memberName.toLowerCase().includes(q) &&
          !roleName.toLowerCase().includes(q) &&
          !a.reason.text.toLowerCase().includes(q) &&
          !(a.reason.createdBy ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [assignments, filterCategory, searchText, memberMap, roleMap]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<ReasonCategory, number>> = {};
    for (const a of assignments) {
      counts[a.reason.category] = (counts[a.reason.category] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  return (
    <StyledContainer>
      <div className="e-toolbar">
        <input
          className="e-search"
          type="text"
          placeholder="スタッフ名・役割・メモで検索..."
          value={searchText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
        />
        <div className="e-category-filters">
          <button
            className={`e-filter-btn ${filterCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            すべて ({assignments.length})
          </button>
          {(Object.entries(CATEGORY_LABELS) as [ReasonCategory, string][]).map(([key, label]) => {
            const count = categoryCounts[key] ?? 0;
            return (
              <button
                key={key}
                className={`e-filter-btn ${filterCategory === key ? 'is-active' : ''}`}
                onClick={() => setFilterCategory(key)}
                style={
                  filterCategory === key
                    ? {}
                    : { backgroundColor: CATEGORY_COLORS[key].bg, color: CATEGORY_COLORS[key].text, borderColor: 'transparent' }
                }
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="e-empty">
          {searchText || filterCategory !== 'all'
            ? '条件に合う配置理由が見つかりません'
            : '配置がまだありません'}
        </div>
      ) : (
        <div className="e-list">
          {filtered.map((assignment) => {
            const member = memberMap.get(assignment.memberId);
            const role = roleMap.get(assignment.roleId);
            const slot = timeSlotMap.get(assignment.timeSlotId);
            const reason = new AssignmentReason(assignment.reason);
            const colors = CATEGORY_COLORS[reason.category];

            const timeStr = slot
              ? `${formatMinutes(slot.startMinute)}〜${formatMinutes(slot.startMinute + slot.durationMinutes)}`
              : '時間帯不明';

            return (
              <div key={assignment.id} className="e-card">
                <div className="e-card-header">
                  <div className="e-names">
                    <span className="e-member-name">{member?.name ?? '（不明）'}</span>
                    <span className="e-arrow">→</span>
                    <span
                      className="e-role-name"
                      style={{ color: role?.color ?? '#555' }}
                    >
                      {role?.name ?? '（不明）'}
                    </span>
                    <span className="e-time-badge">{timeStr}</span>
                  </div>
                  <span
                    className="e-category-badge"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {reason.categoryLabel}
                  </span>
                </div>

                {reason.text ? (
                  <div className="e-reason-text">{reason.text}</div>
                ) : (
                  <div className="e-reason-text e-no-text">（詳細メモなし）</div>
                )}

                <div className="e-meta">
                  {reason.createdBy && <span>記録: {reason.createdBy}</span>}
                  {assignment.locked && <span className="e-locked">🔒 確定済み</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fafafa;

  .e-toolbar {
    padding: 12px;
    background: white;
    border-bottom: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .e-search {
    padding: 7px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9em;
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-filter-btn {
    padding: 3px 10px;
    border: 1px solid #ddd;
    border-radius: 12px;
    background: white;
    font-size: 0.78em;
    cursor: pointer;
    color: #666;
    transition: background 0.1s;

    &.is-active {
      background: #1976d2 !important;
      border-color: #1976d2 !important;
      color: white !important;
    }

    &:hover:not(.is-active) {
      opacity: 0.8;
    }
  }

  .e-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 0.9em;
  }

  .e-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    &:hover {
      border-color: #bdbdbd;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }
  }

  .e-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .e-names {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9em;
    flex-wrap: wrap;
  }

  .e-member-name {
    font-weight: 600;
    color: #222;
  }

  .e-arrow {
    color: #bbb;
  }

  .e-role-name {
    font-weight: 500;
  }

  .e-time-badge {
    background: #f5f5f5;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.82em;
    color: #666;
  }

  .e-category-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.78em;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .e-reason-text {
    font-size: 0.85em;
    color: #444;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .e-no-text {
    color: #bbb;
    font-style: italic;
  }

  .e-meta {
    display: flex;
    gap: 10px;
    font-size: 0.76em;
    color: #aaa;
  }

  .e-locked {
    color: #666;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
