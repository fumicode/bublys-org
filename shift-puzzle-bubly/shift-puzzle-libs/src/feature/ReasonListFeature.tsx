'use client';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useAppSelector } from '@bublys-org/state-management';
import {
  selectShiftPlanById,
  selectMembersForEvent,
  selectRolesForEvent,
  selectTimeSlotsForEvent,
} from '../slice/index.js';
import { ReasonList } from '../ui/index.js';

interface ReasonListFeatureProps {
  shiftPlanId: string;
  eventId: string;
}

/** F-3-3: 配置理由一覧フィーチャー（Redux連携） */
export const ReasonListFeature: React.FC<ReasonListFeatureProps> = ({
  shiftPlanId,
  eventId,
}) => {
  const shiftPlan = useAppSelector(selectShiftPlanById(shiftPlanId));
  const members = useAppSelector(selectMembersForEvent(eventId));
  const roles = useAppSelector(selectRolesForEvent(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.state.id, m.state])),
    [members]
  );

  const roleMap = useMemo(
    () => new Map(roles.map((r) => [r.state.id, r.state])),
    [roles]
  );

  const timeSlotMap = useMemo(
    () => new Map(timeSlots.map((s) => [s.id, s])),
    [timeSlots]
  );

  if (!shiftPlan) {
    return (
      <div style={{ padding: 24, color: '#666', textAlign: 'center' }}>
        シフト案を読み込み中...
      </div>
    );
  }

  const assignments = shiftPlan.state.assignments;

  return (
    <StyledWrapper>
      <div className="e-header">
        <span className="e-plan-name">{shiftPlan.name}</span>
        {shiftPlan.scenarioLabel && (
          <span className="e-scenario-label">{shiftPlan.scenarioLabel}</span>
        )}
        <span className="e-count">{assignments.length}件の配置</span>
      </div>

      <div className="e-body">
        <ReasonList
          assignments={[...assignments]}
          memberMap={memberMap}
          roleMap={roleMap}
          timeSlotMap={timeSlotMap}
        />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid #eee;
    background: #fafafa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .e-plan-name {
    font-weight: 600;
    font-size: 0.95em;
    color: #222;
  }

  .e-scenario-label {
    background: #e8eaf6;
    color: #3949ab;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
  }

  .e-count {
    margin-left: auto;
    font-size: 0.82em;
    color: #888;
  }

  .e-body {
    flex: 1;
    overflow: hidden;
  }
`;
