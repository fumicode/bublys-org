'use client';

import { FC, useMemo } from 'react';
import styled from 'styled-components';
import { useAppSelector } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
} from '../slice/index.js';
import {
  Shift,
  ShiftAssignmentStatus as ShiftAssignmentStatusDomain,
} from '../domain/index.js';
import { createDefaultTimeSchedules } from '../data/sampleData.js';
import { TaskAssignmentStatusView } from '../ui/TaskAssignmentStatusView.js';
import { AssignedMembersView } from '../ui/AssignedMembersView.js';
import { CoverageTetrisView } from '../ui/CoverageTetrisView.js';

// ========== 型定義 ==========

export type ShiftStatusVariant = 'full' | 'members-only' | 'coverage-only';

type ShiftStatusProps = {
  shiftPlanId: string;
  shiftId: string;
  variant?: ShiftStatusVariant;
  /** 親バブル用：AカードとBカードをそれぞれ昇格させる */
  onExpandMembers?: () => void;
  onExpandCoverage?: () => void;
};

// ========== コンポーネント ==========

export const ShiftStatus: FC<ShiftStatusProps> = ({
  shiftPlanId,
  shiftId,
  variant = 'full',
  onExpandMembers,
  onExpandCoverage,
}) => {
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const plan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  // TimeSchedule群はマスター扱い（ShiftPlan に保存されたものがあればそれを使う）
  const fallbackTimeSchedules = useMemo(() => createDefaultTimeSchedules(), []);
  const timeSchedules = useMemo(
    () => (plan && plan.timeSchedules.length > 0 ? plan.timeSchedules : fallbackTimeSchedules),
    [plan, fallbackTimeSchedules],
  );

  // 対象Shiftと計算
  const computed = useMemo(() => {
    if (!plan) return null;
    const shift = plan.shifts.find((s) => s.id === shiftId);
    if (!shift) return null;

    const timeSchedule = shift.timeScheduleId
      ? timeSchedules.find((ts) => ts.id === shift.timeScheduleId)
      : undefined;
    if (!timeSchedule) return null;

    const status = ShiftAssignmentStatusDomain.compute(
      shift,
      timeSchedule,
      members,
      plan.shifts,
    );

    const memberNameMap = new Map(members.map((m) => [m.id, m.name]));

    return { shift, timeSchedule, status, memberNameMap };
  }, [plan, shiftId, timeSchedules, members]);

  if (!computed) {
    return (
      <StyledEmpty>
        {plan ? 'シフトが見つかりません' : 'プランが読み込まれていません'}
      </StyledEmpty>
    );
  }

  const { shift, status, memberNameMap } = computed;
  const header = {
    taskName: shift.taskName,
    dayType: shift.dayType,
    startTime: shift.startTime,
    endTime: shift.endTime,
    responsibleDepartment: shift.responsibleDepartment,
  };

  if (variant === 'members-only') {
    return (
      <StyledSingle>
        <SingleHeader shift={shift} status={status} />
        <AssignedMembersView
          memberSummaries={status.memberSummaries}
          shiftViolations={status.shiftViolations}
          density="full"
        />
      </StyledSingle>
    );
  }

  if (variant === 'coverage-only') {
    return (
      <StyledSingle>
        <SingleHeader shift={shift} status={status} />
        <CoverageTetrisView
          blockCoverages={status.blockCoverages}
          requiredCount={status.requiredCount}
          memberNameMap={memberNameMap}
          density="full"
        />
      </StyledSingle>
    );
  }

  return (
    <TaskAssignmentStatusView
      header={header}
      status={status}
      memberNameMap={memberNameMap}
      onExpandMembers={onExpandMembers}
      onExpandCoverage={onExpandCoverage}
    />
  );
};

// ========== 単独表示用ヘッダ ==========

const SingleHeader: FC<{ shift: Shift; status: ShiftAssignmentStatusDomain }> = ({ shift, status }) => {
  const rate = Math.round(status.fulfillmentRate);
  return (
    <div className="sh-header">
      <h3>{shift.taskName}</h3>
      <span className="sh-meta">
        {shift.dayType} · {shift.startTime}–{shift.endTime}
      </span>
      <span className="sh-stat">必要 {status.requiredCount}名 / 充足 {rate}%</span>
    </div>
  );
};

// ========== スタイル ==========

const StyledEmpty = styled.div`
  padding: 16px;
  color: #888;
  font-size: 0.9em;
`;

const StyledSingle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;

  .sh-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
    flex-wrap: wrap;
    h3 { margin: 0; font-size: 1.05em; }
  }
  .sh-meta { color: #666; font-size: 0.85em; }
  .sh-stat {
    margin-left: auto;
    color: #333;
    font-size: 0.85em;
    font-weight: 600;
  }
`;
