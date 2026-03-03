'use client';
import React from 'react';
import { useAppSelector } from '@bublys-org/state-management';
import {
  selectRolesForEvent,
  selectEventById,
  selectTimeSlotsForEvent,
  selectMembersForEvent,
  selectAssignmentsForPlan,
} from '../slice/index.js';
import { RoleFulfillmentView } from '../ui/RoleFulfillment/RoleFulfillmentView.js';

interface RoleFulfillmentFeatureProps {
  eventId: string;
  roleId: string;
  shiftPlanId?: string;
}

/** F-4-2: 役割充足状況（配置人数/必要人数・スキル充足率） */
export const RoleFulfillmentFeature: React.FC<RoleFulfillmentFeatureProps> = ({
  eventId,
  roleId,
  shiftPlanId,
}) => {
  const roles = useAppSelector(selectRolesForEvent(eventId));
  const event = useAppSelector(selectEventById(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));
  const members = useAppSelector(selectMembersForEvent(eventId));
  const assignments = useAppSelector(selectAssignmentsForPlan(shiftPlanId ?? ''));

  const role = roles.find((r) => r.state.id === roleId);
  const skillDefinitions = event?.state.skillDefinitions ?? [];

  const assignmentStates = assignments.map((a) => a.state);
  const memberStates = members.map((m) => m.state);

  if (!role) {
    return (
      <div style={{ padding: 24, color: '#888', textAlign: 'center' }}>
        役割が見つかりません（ID: {roleId}）
      </div>
    );
  }

  return (
    <RoleFulfillmentView
      role={role.state}
      assignments={assignmentStates}
      timeSlots={timeSlots}
      members={memberStates}
      skillDefinitions={skillDefinitions}
    />
  );
};
