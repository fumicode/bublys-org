'use client';
import React from 'react';
import { useAppSelector } from '@bublys-org/state-management';
import {
  selectMembersForEvent,
  selectRolesForEvent,
  selectTimeSlotsForEvent,
  selectAssignmentsForPlan,
} from '../slice/index.js';
import { ShiftPlanSummaryView } from '../ui/Summary/ShiftPlanSummaryView.js';

interface ShiftPlanSummaryProps {
  eventId: string;
  shiftPlanId: string;
}

/** F-7-1〜F-7-3: シフト案評価サマリー（Redux連携） */
export const ShiftPlanSummary: React.FC<ShiftPlanSummaryProps> = ({
  eventId,
  shiftPlanId,
}) => {
  const members = useAppSelector(selectMembersForEvent(eventId));
  const roles = useAppSelector(selectRolesForEvent(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));
  const assignments = useAppSelector(selectAssignmentsForPlan(shiftPlanId));

  return (
    <ShiftPlanSummaryView
      members={members.map((m) => m.state)}
      roles={roles.map((r) => r.state)}
      timeSlots={timeSlots}
      assignments={assignments.map((a) => a.state)}
    />
  );
};
