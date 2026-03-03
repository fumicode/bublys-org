'use client';
import React, { useCallback } from 'react';
import {
  useAppDispatch,
  useAppSelector,
  addPocketItem,
  selectPocketItems,
} from '@bublys-org/state-management';
import { getDragType } from '@bublys-org/bubbles-ui';
import {
  selectMembersForEvent,
  selectEventById,
  selectTimeSlotsForEvent,
  selectAssignmentsForPlan,
  selectRolesForEvent,
} from '../slice/index.js';
import { MemberDetailView } from '../ui/MemberDetail/MemberDetailView.js';

interface MemberDetailFeatureProps {
  eventId: string;
  memberId: string;
  shiftPlanId?: string;
}

/** F-4-1: メンバー詳細（スキル・参加可能時間・現在の配置状況） + F-4-3: ポケット追加 */
export const MemberDetailFeature: React.FC<MemberDetailFeatureProps> = ({
  eventId,
  memberId,
  shiftPlanId,
}) => {
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectMembersForEvent(eventId));
  const event = useAppSelector(selectEventById(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));
  const roles = useAppSelector(selectRolesForEvent(eventId));
  const assignments = useAppSelector(selectAssignmentsForPlan(shiftPlanId ?? ''));
  const pocketItems = useAppSelector(selectPocketItems);

  const member = members.find((m) => m.state.id === memberId);
  const skillDefinitions = event?.state.skillDefinitions ?? [];

  const assignmentStates = assignments.map((a) => a.state);
  const roleStates = roles.map((r) => r.state);

  // ポケット内に既にこのメンバーが存在するか
  const pocketUrl = shiftPlanId
    ? `shift-puzzle/events/${eventId}/shift-plans/${shiftPlanId}/member/${memberId}`
    : `shift-puzzle/events/${eventId}/members/${memberId}`;
  const isPocketed = pocketItems.some((item) => item.url === pocketUrl);

  const handleAddToPocket = useCallback(() => {
    if (isPocketed || !member) return;
    dispatch(
      addPocketItem({
        id: crypto.randomUUID(),
        url: pocketUrl,
        type: getDragType('Member'),
        objectId: memberId,
        label: member.state.name,
        addedAt: Date.now(),
      })
    );
  }, [dispatch, isPocketed, member, memberId, pocketUrl]);

  if (!member) {
    return (
      <div style={{ padding: 24, color: '#888', textAlign: 'center' }}>
        メンバーが見つかりません（ID: {memberId}）
      </div>
    );
  }

  return (
    <MemberDetailView
      member={member.state}
      skillDefinitions={skillDefinitions}
      timeSlots={timeSlots}
      assignments={assignmentStates}
      roles={roleStates}
      isPocketed={isPocketed}
      onAddToPocket={handleAddToPocket}
    />
  );
};
