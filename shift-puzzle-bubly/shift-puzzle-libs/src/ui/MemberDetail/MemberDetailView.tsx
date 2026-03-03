'use client';
import React from 'react';
import styled from 'styled-components';
import type {
  MemberState,
  TimeSlotState,
  SkillDefinitionState,
  AssignmentState,
  RoleState,
} from '@bublys-org/shift-puzzle-model';

export interface MemberDetailViewProps {
  member: MemberState;
  skillDefinitions?: ReadonlyArray<SkillDefinitionState>;
  timeSlots?: ReadonlyArray<TimeSlotState>;
  /** このシフト案内での配置一覧 */
  assignments?: ReadonlyArray<AssignmentState>;
  roles?: ReadonlyArray<RoleState>;
  isPocketed?: boolean;
  onAddToPocket?: () => void;
}

/** F-4-1: メンバー詳細バブル（スキル・参加可能時間・現在の配置状況） */
export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  member,
  skillDefinitions = [],
  timeSlots = [],
  assignments = [],
  roles = [],
  isPocketed = false,
  onAddToPocket,
}) => {
  const skillLabels = member.skills
    .map((skillId) => skillDefinitions.find((d) => d.id === skillId)?.label ?? skillId)
    .filter(Boolean);

  const availableSlots = timeSlots.filter((s) => member.availableSlotIds.includes(s.id));
  const totalCount = timeSlots.length;
  const availableCount = availableSlots.length;

  const myAssignments = assignments.filter((a) => a.memberId === member.id);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const getRoleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? roleId;

  const getSlotLabel = (slotId: string) => {
    const slot = timeSlots.find((s) => s.id === slotId);
    if (!slot) return slotId;
    return `${formatTime(slot.startMinute)}〜${formatTime(slot.startMinute + slot.durationMinutes)}`;
  };

  return (
    <StyledWrapper>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-name">{member.name}</div>
        {onAddToPocket && (
          <button
            className={`e-pocket-btn ${isPocketed ? 'is-pocketed' : ''}`}
            onClick={onAddToPocket}
            disabled={isPocketed}
            title={isPocketed ? 'ポケット済み' : 'ポケットに追加'}
          >
            {isPocketed ? '📌 ポケット済み' : '📌 ポケットに追加'}
          </button>
        )}
      </div>

      {/* F-1-4: タグ */}
      {member.tags.length > 0 && (
        <div className="e-section">
          <div className="e-section-title">タグ</div>
          <div className="e-tags">
            {member.tags.map((tag) => (
              <span key={tag} className="e-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* F-1-2: スキル */}
      <div className="e-section">
        <div className="e-section-title">スキル</div>
        {skillLabels.length > 0 ? (
          <div className="e-skills">
            {skillLabels.map((label) => (
              <span key={label} className="e-skill-badge">✓ {label}</span>
            ))}
          </div>
        ) : (
          <div className="e-empty-note">スキル未登録</div>
        )}
      </div>

      {/* F-1-3: 参加可能時間帯 */}
      {totalCount > 0 && (
        <div className="e-section">
          <div className="e-section-title">
            参加可能時間帯
            <span className="e-count-badge">{availableCount}/{totalCount}</span>
          </div>
          <div className="e-avail-bar-wrap">
            <div
              className="e-avail-bar"
              style={{ width: `${(availableCount / totalCount) * 100}%` }}
            />
          </div>
          {availableSlots.length > 0 && (
            <div className="e-slot-list">
              {availableSlots.map((slot) => (
                <span key={slot.id} className="e-slot-chip">
                  {formatTime(slot.startMinute)}〜{formatTime(slot.startMinute + slot.durationMinutes)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 現在の配置状況 */}
      <div className="e-section">
        <div className="e-section-title">
          現在の配置
          <span className="e-count-badge">{myAssignments.length}件</span>
        </div>
        {myAssignments.length > 0 ? (
          <div className="e-assignment-list">
            {myAssignments.map((a) => (
              <div key={a.id} className="e-assignment-item">
                <span
                  className="e-role-dot"
                  style={{ background: roles.find((r) => r.id === a.roleId)?.color ?? '#999' }}
                />
                <span className="e-role-name">{getRoleName(a.roleId)}</span>
                <span className="e-slot-time">{getSlotLabel(a.timeSlotId)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="e-empty-note">このシフト案では未配置</div>
        )}
      </div>

      {/* メモ */}
      {member.memo && (
        <div className="e-section">
          <div className="e-section-title">メモ</div>
          <div className="e-memo">{member.memo}</div>
        </div>
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: #fafafa;
  gap: 0;

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: white;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    gap: 8px;
  }

  .e-name {
    font-size: 1.05em;
    font-weight: 700;
    color: #222;
  }

  .e-pocket-btn {
    padding: 5px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.8em;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;

    &:hover:not(:disabled) {
      background: #e0f2fe;
      border-color: #0284c7;
      color: #0284c7;
    }

    &.is-pocketed {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1d4ed8;
      cursor: default;
    }
  }

  .e-section {
    padding: 10px 14px;
    border-bottom: 1px solid #f0f0f0;
    background: white;
  }

  .e-section-title {
    font-size: 0.75em;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .e-count-badge {
    background: #f0f0f0;
    color: #555;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 0.9em;
    font-weight: 500;
    text-transform: none;
  }

  .e-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-tag {
    background: #e3f2fd;
    color: #1565c0;
    padding: 2px 9px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: 500;
  }

  .e-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-skill-badge {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 2px 9px;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: 500;
  }

  .e-empty-note {
    font-size: 0.82em;
    color: #bbb;
  }

  .e-avail-bar-wrap {
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .e-avail-bar {
    height: 100%;
    background: #4caf50;
    border-radius: 3px;
    transition: width 0.3s;
  }

  .e-slot-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-slot-chip {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    color: #555;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.76em;
  }

  .e-assignment-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .e-assignment-item {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.85em;
  }

  .e-role-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .e-role-name {
    font-weight: 500;
    color: #333;
    flex: 1;
  }

  .e-slot-time {
    color: #888;
    font-size: 0.9em;
    white-space: nowrap;
  }

  .e-memo {
    font-size: 0.85em;
    color: #666;
    line-height: 1.5;
    white-space: pre-wrap;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
