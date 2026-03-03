'use client';
import React from 'react';
import styled from 'styled-components';
import type {
  AssignmentState,
  RoleState,
  MemberState,
  TimeSlotState,
  ConstraintViolation,
} from '@bublys-org/shift-puzzle-model';
import { AssignmentBlock } from './AssignmentBlock.js';
import { ConflictHighlight } from './ConflictHighlight.js';

interface MemberRowProps {
  label: string;
  /** F-2-7: このメンバーが参加可能なTimeSlot.id群 */
  availableSlotIds?: ReadonlyArray<string>;
  assignments: AssignmentState[];
  roleMap: Map<string, RoleState>;
  memberMap: Map<string, MemberState>;
  /** 同日のTimeSlot一覧 */
  dayTimeSlots: TimeSlotState[];
  violations: ConstraintViolation[];
  rowHeight: number;
  dayStartMinute: number;
  hourPx: number;
  dayWidth: number;
  /** バーラベルモード: 役割名 or メンバー名 */
  barLabelMode: 'role' | 'member';
  onAssignmentClick?: (assignmentId: string) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onRowClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/** ガントチャートの1行（メンバー or 役割） */
export const MemberRow: React.FC<MemberRowProps> = ({
  availableSlotIds,
  assignments,
  roleMap,
  memberMap,
  dayTimeSlots,
  violations,
  rowHeight,
  dayStartMinute,
  hourPx,
  dayWidth,
  barLabelMode,
  onAssignmentClick,
  onDragOver,
  onDrop,
  onRowClick,
}) => {
  const minutePx = hourPx / 60;

  const slotToRect = (slot: TimeSlotState) => ({
    left: (slot.startMinute - dayStartMinute) * minutePx,
    width: slot.durationMinutes * minutePx,
  });

  const findViolation = (assignmentId: string) =>
    violations.find((v) => v.assignmentId === assignmentId);

  const availableRects = availableSlotIds
    ? dayTimeSlots.filter((s) => availableSlotIds.includes(s.id)).map(slotToRect)
    : [];

  return (
    <StyledRow
      style={{ height: rowHeight, width: dayWidth }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onRowClick}
    >
      {/* F-2-7: 参加可能時間帯のオーバーレイ */}
      {availableRects.map((rect, i) => (
        <div
          key={i}
          className="e-available-overlay"
          style={{ left: rect.left, width: rect.width }}
        />
      ))}

      {/* 配置ブロック */}
      {assignments.map((assignment) => {
        const slot = dayTimeSlots.find((s) => s.id === assignment.timeSlotId);
        if (!slot) return null;
        const { left, width } = slotToRect(slot);
        const violation = findViolation(assignment.id);
        const role = roleMap.get(assignment.roleId);
        const member = memberMap.get(assignment.memberId);

        return (
          <React.Fragment key={assignment.id}>
            <AssignmentBlock
              assignment={assignment}
              role={barLabelMode === 'role' ? undefined : role}
              member={barLabelMode === 'member' ? undefined : member}
              memberName={member?.name}
              roleName={role?.name}
              left={left}
              width={width}
              rowHeight={rowHeight}
              violation={violation}
              onClick={onAssignmentClick}
            />
            {/* F-2-6: 制約違反ハイライト */}
            {violation && (
              <ConflictHighlight
                violation={violation}
                left={left}
                width={width}
                rowHeight={rowHeight}
              />
            )}
          </React.Fragment>
        );
      })}
    </StyledRow>
  );
};

const StyledRow = styled.div`
  position: relative;
  border-bottom: 1px solid #eee;
  cursor: crosshair;

  &:hover {
    background-color: rgba(25, 118, 210, 0.04);
  }

  .e-available-overlay {
    position: absolute;
    top: 2px;
    height: calc(100% - 4px);
    background-color: rgba(76, 175, 80, 0.12);
    border: 1px solid rgba(76, 175, 80, 0.3);
    border-radius: 2px;
    pointer-events: none;
    z-index: 1;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
