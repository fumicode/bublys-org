'use client';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type {
  RoleState,
  TimeSlotState,
  MemberState,
  AssignmentState,
  SkillDefinitionState,
} from '@bublys-org/shift-puzzle-model';

export interface RoleFulfillmentViewProps {
  role: RoleState;
  /** このシフト案内での配置一覧 */
  assignments?: ReadonlyArray<AssignmentState>;
  timeSlots?: ReadonlyArray<TimeSlotState>;
  members?: ReadonlyArray<MemberState>;
  skillDefinitions?: ReadonlyArray<SkillDefinitionState>;
}

/** F-4-2: 役割充足状況バブル（配置人数/必要人数・スキル充足率） */
export const RoleFulfillmentView: React.FC<RoleFulfillmentViewProps> = ({
  role,
  assignments = [],
  timeSlots = [],
  members = [],
  skillDefinitions = [],
}) => {
  const roleAssignments = assignments.filter((a) => a.roleId === role.id);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name ?? memberId;

  // 時間帯ごとの充足状況
  const slotFulfillment = useMemo(() => {
    return timeSlots.map((slot) => {
      const count = roleAssignments.filter((a) => a.timeSlotId === slot.id).length;
      const assignedMembers = roleAssignments
        .filter((a) => a.timeSlotId === slot.id)
        .map((a) => getMemberName(a.memberId));
      const isFulfilled = count >= role.minRequired;
      const isOverFilled = role.maxRequired !== null && count > role.maxRequired;
      return { slot, count, assignedMembers, isFulfilled, isOverFilled };
    });
  }, [timeSlots, roleAssignments, role, members]);

  // 全体充足率（充足スロット数 / 全スロット数）
  const fulfilledCount = slotFulfillment.filter((s) => s.isFulfilled).length;
  const totalSlots = timeSlots.length;
  const fulfillRate = totalSlots > 0 ? (fulfilledCount / totalSlots) * 100 : 0;

  const requiredSkillLabels = role.requiredSkillIds.map(
    (id) => skillDefinitions.find((d) => d.id === id)?.label ?? id
  );

  return (
    <StyledWrapper>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-role-dot" style={{ background: role.color }} />
        <div className="e-name">{role.name}</div>
      </div>

      {/* 概要 */}
      {role.description && (
        <div className="e-section">
          <div className="e-section-title">説明</div>
          <div className="e-description">{role.description}</div>
        </div>
      )}

      {/* 必要人数 */}
      <div className="e-section">
        <div className="e-section-title">必要人数</div>
        <div className="e-requirement">
          <span className="e-req-min">{role.minRequired}名以上</span>
          {role.maxRequired !== null && (
            <span className="e-req-max">{role.maxRequired}名以下</span>
          )}
        </div>
      </div>

      {/* 必須スキル */}
      <div className="e-section">
        <div className="e-section-title">必須スキル</div>
        {requiredSkillLabels.length > 0 ? (
          <div className="e-skills">
            {requiredSkillLabels.map((label) => (
              <span key={label} className="e-skill-badge">✓ {label}</span>
            ))}
          </div>
        ) : (
          <div className="e-empty-note">スキル要件なし</div>
        )}
      </div>

      {/* 充足状況サマリー */}
      {totalSlots > 0 && (
        <div className="e-section">
          <div className="e-section-title">
            充足状況
            <span className={`e-fulfill-badge ${fulfillRate === 100 ? 'is-full' : fulfillRate > 0 ? 'is-partial' : 'is-empty'}`}>
              {fulfilledCount}/{totalSlots} スロット充足
            </span>
          </div>
          <div className="e-fulfill-bar-wrap">
            <div
              className={`e-fulfill-bar ${fulfillRate === 100 ? 'is-full' : ''}`}
              style={{ width: `${fulfillRate}%` }}
            />
          </div>
        </div>
      )}

      {/* 時間帯別充足 */}
      {timeSlots.length > 0 && (
        <div className="e-section">
          <div className="e-section-title">時間帯別配置</div>
          <div className="e-slot-table">
            {slotFulfillment.map(({ slot, count, assignedMembers, isFulfilled, isOverFilled }) => (
              <div
                key={slot.id}
                className={`e-slot-row ${isFulfilled ? 'is-fulfilled' : 'is-short'} ${isOverFilled ? 'is-over' : ''}`}
              >
                <div className="e-slot-time">
                  {formatTime(slot.startMinute)}〜{formatTime(slot.startMinute + slot.durationMinutes)}
                </div>
                <div className="e-slot-count">
                  <span className={`e-count-num ${isFulfilled ? 'ok' : 'ng'}`}>{count}</span>
                  <span className="e-count-slash">/</span>
                  <span className="e-count-req">{role.minRequired}</span>
                </div>
                {assignedMembers.length > 0 && (
                  <div className="e-slot-members">
                    {assignedMembers.map((name, i) => (
                      <span key={i} className="e-member-chip">{name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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

  .e-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: white;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .e-role-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .e-name {
    font-size: 1.05em;
    font-weight: 700;
    color: #222;
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

  .e-description {
    font-size: 0.88em;
    color: #555;
    line-height: 1.5;
  }

  .e-requirement {
    display: flex;
    gap: 8px;
  }

  .e-req-min {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 600;
  }

  .e-req-max {
    background: #fff3e0;
    color: #e65100;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 600;
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

  .e-fulfill-badge {
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 0.9em;
    font-weight: 500;
    text-transform: none;

    &.is-full {
      background: #e8f5e9;
      color: #2e7d32;
    }
    &.is-partial {
      background: #fff3e0;
      color: #e65100;
    }
    &.is-empty {
      background: #fce4e4;
      color: #c62828;
    }
  }

  .e-fulfill-bar-wrap {
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  .e-fulfill-bar {
    height: 100%;
    background: #ff9800;
    border-radius: 3px;
    transition: width 0.3s;

    &.is-full {
      background: #4caf50;
    }
  }

  .e-slot-table {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-slot-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 8px;
    border-radius: 5px;
    border: 1px solid #e0e0e0;
    background: #fafafa;

    &.is-fulfilled {
      border-color: #a5d6a7;
      background: #f1f8f1;
    }

    &.is-short {
      border-color: #ffcc80;
      background: #fff8f0;
    }

    &.is-over {
      border-color: #ef9a9a;
      background: #fff5f5;
    }
  }

  .e-slot-time {
    font-size: 0.8em;
    color: #666;
    font-weight: 500;
  }

  .e-slot-count {
    display: flex;
    align-items: baseline;
    gap: 2px;
    font-size: 0.9em;
  }

  .e-count-num {
    font-weight: 700;
    font-size: 1.1em;

    &.ok { color: #2e7d32; }
    &.ng { color: #e65100; }
  }

  .e-count-slash {
    color: #bbb;
    font-size: 0.9em;
  }

  .e-count-req {
    color: #888;
    font-size: 0.9em;
  }

  .e-slot-members {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .e-member-chip {
    background: white;
    border: 1px solid #ddd;
    color: #555;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 0.76em;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
