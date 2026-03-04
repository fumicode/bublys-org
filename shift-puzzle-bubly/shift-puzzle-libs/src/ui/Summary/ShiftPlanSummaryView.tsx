'use client';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type {
  MemberState,
  RoleState,
  TimeSlotState,
  AssignmentState,
} from '@bublys-org/shift-puzzle-model';

// ========== 型定義 ==========

/** メンバー拘束時間サマリー（F-7-1） */
export interface MemberWorkloadSummary {
  member: MemberState;
  totalMinutes: number;
  isUnassigned: boolean;
  isOverloaded: boolean;
}

/** 役割充足状況サマリー（F-7-2） */
export interface RoleFulfillmentSummary {
  role: RoleState;
  /** 充足スロット数 */
  fulfilledSlots: number;
  /** 全スロット数（minRequired > 0 のもの） */
  totalSlots: number;
  /** 不足合計人数（全スロット分の合算） */
  totalShortfall: number;
  /** 充足率 (0〜100) */
  fulfillmentRate: number;
  isFullyFulfilled: boolean;
}

/** アラート（F-7-3） */
export interface SummaryAlert {
  type: 'unassigned_member' | 'understaffed_role';
  label: string;
  detail: string;
}

export interface ShiftPlanSummaryViewProps {
  members: ReadonlyArray<MemberState>;
  roles: ReadonlyArray<RoleState>;
  timeSlots: ReadonlyArray<TimeSlotState>;
  assignments: ReadonlyArray<AssignmentState>;
}

// ========== ヘルパー ==========

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

// ========== コンポーネント ==========

/** F-7-1〜F-7-3: シフト案評価サマリービュー */
export const ShiftPlanSummaryView: React.FC<ShiftPlanSummaryViewProps> = ({
  members,
  roles,
  timeSlots,
  assignments,
}) => {
  // タイムスロットをMapに変換
  const timeSlotMap = useMemo(
    () => new Map(timeSlots.map((ts) => [ts.id, ts])),
    [timeSlots]
  );

  // F-7-1: メンバーごとの総拘束時間
  const memberWorkloads = useMemo((): MemberWorkloadSummary[] => {
    const assignedMinutes = new Map<string, number>();
    for (const assignment of assignments) {
      const slot = timeSlotMap.get(assignment.timeSlotId);
      const duration = slot?.durationMinutes ?? 0;
      assignedMinutes.set(
        assignment.memberId,
        (assignedMinutes.get(assignment.memberId) ?? 0) + duration
      );
    }

    // 平均拘束時間（配置済みメンバーのみ）
    const assignedValues = [...assignedMinutes.values()].filter((v) => v > 0);
    const avgMinutes =
      assignedValues.length > 0
        ? assignedValues.reduce((s, v) => s + v, 0) / assignedValues.length
        : 0;

    return members.map((member) => {
      const totalMinutes = assignedMinutes.get(member.id) ?? 0;
      return {
        member,
        totalMinutes,
        isUnassigned: totalMinutes === 0,
        isOverloaded: avgMinutes > 0 && totalMinutes > avgMinutes * 1.8,
      };
    });
  }, [members, assignments, timeSlotMap]);

  const maxWorkloadMinutes = useMemo(
    () => Math.max(...memberWorkloads.map((w) => w.totalMinutes), 1),
    [memberWorkloads]
  );

  // F-7-2: 役割ごとの充足率
  const roleFulfillments = useMemo((): RoleFulfillmentSummary[] => {
    // timeSlotId × roleId での配置人数集計
    const countMap = new Map<string, number>();
    for (const assignment of assignments) {
      const key = `${assignment.timeSlotId}:${assignment.roleId}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    return roles.map((role) => {
      const relevantSlots = timeSlots.filter(() => role.minRequired > 0);
      let fulfilledSlots = 0;
      let totalShortfall = 0;

      for (const slot of relevantSlots) {
        const assigned = countMap.get(`${slot.id}:${role.id}`) ?? 0;
        if (assigned >= role.minRequired) {
          fulfilledSlots++;
        } else {
          totalShortfall += role.minRequired - assigned;
        }
      }

      const totalSlots = relevantSlots.length;
      const fulfillmentRate =
        totalSlots > 0 ? (fulfilledSlots / totalSlots) * 100 : 100;

      return {
        role,
        fulfilledSlots,
        totalSlots,
        totalShortfall,
        fulfillmentRate,
        isFullyFulfilled: fulfilledSlots === totalSlots,
      };
    });
  }, [roles, timeSlots, assignments]);

  // F-7-3: アラート生成
  const alerts = useMemo((): SummaryAlert[] => {
    const result: SummaryAlert[] = [];

    // 未配置メンバー
    for (const w of memberWorkloads) {
      if (w.isUnassigned) {
        result.push({
          type: 'unassigned_member',
          label: w.member.name,
          detail: '配置なし',
        });
      }
    }

    // 充足不足役割
    for (const f of roleFulfillments) {
      if (!f.isFullyFulfilled && f.totalShortfall > 0) {
        result.push({
          type: 'understaffed_role',
          label: f.role.name,
          detail: `計${f.totalShortfall}人不足（${f.fulfilledSlots}/${f.totalSlots}スロット充足）`,
        });
      }
    }

    return result;
  }, [memberWorkloads, roleFulfillments]);

  // 全体スコア
  const overallScore = useMemo(() => {
    if (roleFulfillments.length === 0) return 100;
    const fulfilledCount = roleFulfillments.filter((f) => f.isFullyFulfilled).length;
    return Math.round((fulfilledCount / roleFulfillments.length) * 100);
  }, [roleFulfillments]);

  return (
    <StyledWrapper>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-header-title">評価サマリー</div>
        <div className={`e-score-badge ${overallScore === 100 ? 'is-perfect' : overallScore >= 60 ? 'is-good' : 'is-poor'}`}>
          充足スコア {overallScore}%
        </div>
      </div>

      {/* F-7-3: アラート */}
      {alerts.length > 0 && (
        <section className="e-section">
          <div className="e-section-title">
            ⚠ アラート
            <span className="e-badge e-badge--warn">{alerts.length}件</span>
          </div>
          <div className="e-alert-list">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`e-alert-item ${alert.type === 'unassigned_member' ? 'is-member' : 'is-role'}`}
              >
                <span className="e-alert-icon">
                  {alert.type === 'unassigned_member' ? '👤' : '📋'}
                </span>
                <span className="e-alert-label">{alert.label}</span>
                <span className="e-alert-detail">{alert.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* F-7-2: 役割充足率 */}
      <section className="e-section">
        <div className="e-section-title">役割充足状況</div>
        <div className="e-role-list">
          {roleFulfillments.map(({ role, fulfilledSlots, totalSlots, fulfillmentRate, isFullyFulfilled, totalShortfall }) => (
            <div key={role.id} className="e-role-row">
              <div className="e-role-row-header">
                <div className="e-role-dot" style={{ background: role.color }} />
                <span className="e-role-name">{role.name}</span>
                <span className={`e-role-status ${isFullyFulfilled ? 'is-ok' : 'is-ng'}`}>
                  {isFullyFulfilled ? '✓' : `⚠ ${totalShortfall}人不足`}
                </span>
                <span className="e-role-rate">{Math.round(fulfillmentRate)}%</span>
              </div>
              <div className="e-progress-wrap">
                <div
                  className={`e-progress-bar ${isFullyFulfilled ? 'is-full' : fulfillmentRate > 0 ? 'is-partial' : 'is-empty'}`}
                  style={{ width: `${fulfillmentRate}%` }}
                />
              </div>
              <div className="e-role-slots">
                {fulfilledSlots}/{totalSlots}スロット充足
              </div>
            </div>
          ))}
          {roleFulfillments.length === 0 && (
            <div className="e-empty">役割が登録されていません</div>
          )}
        </div>
      </section>

      {/* F-7-1: メンバー拘束時間 */}
      <section className="e-section">
        <div className="e-section-title">メンバー拘束時間</div>
        <div className="e-member-list">
          {memberWorkloads.map(({ member, totalMinutes, isUnassigned, isOverloaded }) => (
            <div
              key={member.id}
              className={`e-member-row ${isUnassigned ? 'is-unassigned' : ''} ${isOverloaded ? 'is-overloaded' : ''}`}
            >
              <span className="e-member-name">{member.name}</span>
              <div className="e-member-bar-wrap">
                <div
                  className={`e-member-bar ${isOverloaded ? 'is-over' : ''}`}
                  style={{ width: `${(totalMinutes / maxWorkloadMinutes) * 100}%` }}
                />
              </div>
              <span className="e-member-time">
                {isUnassigned ? (
                  <span className="e-unassigned-label">未配置</span>
                ) : (
                  <>
                    {formatMinutes(totalMinutes)}
                    {isOverloaded && <span className="e-overload-label">過負荷</span>}
                  </>
                )}
              </span>
            </div>
          ))}
          {memberWorkloads.length === 0 && (
            <div className="e-empty">メンバーが登録されていません</div>
          )}
        </div>
      </section>
    </StyledWrapper>
  );
};

// ========== スタイル ==========

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

  .e-header-title {
    font-size: 1.05em;
    font-weight: 700;
    color: #222;
  }

  .e-score-badge {
    margin-left: auto;
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 0.85em;
    font-weight: 600;

    &.is-perfect {
      background: #e8f5e9;
      color: #2e7d32;
    }
    &.is-good {
      background: #fff3e0;
      color: #e65100;
    }
    &.is-poor {
      background: #fce4e4;
      color: #c62828;
    }
  }

  .e-section {
    background: white;
    border-bottom: 1px solid #f0f0f0;
    padding: 10px 14px;
  }

  .e-section-title {
    font-size: 0.75em;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .e-badge {
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 0.9em;
    font-weight: 500;
    text-transform: none;

    &.e-badge--warn {
      background: #fce4e4;
      color: #c62828;
    }
  }

  /* F-7-3: アラートリスト */
  .e-alert-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-alert-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 5px;
    font-size: 0.85em;

    &.is-member {
      background: #fff8e1;
      border: 1px solid #ffe082;
    }
    &.is-role {
      background: #fce4e4;
      border: 1px solid #ef9a9a;
    }
  }

  .e-alert-icon {
    font-size: 1em;
  }

  .e-alert-label {
    font-weight: 600;
    color: #333;
  }

  .e-alert-detail {
    color: #666;
    margin-left: auto;
    font-size: 0.9em;
  }

  /* F-7-2: 役割充足率 */
  .e-role-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-role-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .e-role-row-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.88em;
  }

  .e-role-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .e-role-name {
    font-weight: 600;
    color: #333;
  }

  .e-role-status {
    margin-left: auto;
    font-size: 0.85em;

    &.is-ok {
      color: #2e7d32;
    }
    &.is-ng {
      color: #c62828;
      font-weight: 600;
    }
  }

  .e-role-rate {
    font-size: 0.85em;
    color: #666;
    min-width: 36px;
    text-align: right;
  }

  .e-progress-wrap {
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  .e-progress-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;

    &.is-full {
      background: #4caf50;
    }
    &.is-partial {
      background: #ff9800;
    }
    &.is-empty {
      background: #ef5350;
      width: 0% !important;
    }
  }

  .e-role-slots {
    font-size: 0.76em;
    color: #aaa;
  }

  /* F-7-1: メンバー拘束時間 */
  .e-member-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-member-row {
    display: grid;
    grid-template-columns: 100px 1fr 90px;
    align-items: center;
    gap: 6px;
    font-size: 0.85em;

    &.is-unassigned .e-member-name {
      color: #bbb;
    }

    &.is-overloaded .e-member-name {
      color: #c62828;
      font-weight: 600;
    }
  }

  .e-member-name {
    color: #333;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .e-member-bar-wrap {
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .e-member-bar {
    height: 100%;
    background: #42a5f5;
    border-radius: 4px;
    transition: width 0.3s;
    min-width: 2px;

    &.is-over {
      background: #ef5350;
    }
  }

  .e-member-time {
    text-align: right;
    color: #555;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  .e-unassigned-label {
    color: #bbb;
    font-size: 0.9em;
  }

  .e-overload-label {
    background: #fce4e4;
    color: #c62828;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.8em;
    font-weight: 600;
  }

  .e-empty {
    font-size: 0.85em;
    color: #bbb;
    padding: 8px 0;
    text-align: center;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
