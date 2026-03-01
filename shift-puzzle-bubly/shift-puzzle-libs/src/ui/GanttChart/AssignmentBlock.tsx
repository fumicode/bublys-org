'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import type {
  AssignmentState,
  RoleState,
  MemberState,
  ConstraintViolation,
} from '@bublys-org/shift-puzzle-model';
import { ReasonPopover } from '../ReasonPanel/ReasonPopover.js';

interface AssignmentBlockProps {
  assignment: AssignmentState;
  /** バーに表示するラベル元（役割名 or メンバー名） */
  role: RoleState | undefined;
  member: MemberState | undefined;
  left: number;
  width: number;
  rowHeight: number;
  violation?: ConstraintViolation;
  onClick?: (assignmentId: string) => void;
  /** F-3-2: ポップオーバーに表示するメンバー名（常に渡す） */
  memberName?: string;
  /** F-3-2: ポップオーバーに表示する役割名（常に渡す） */
  roleName?: string;
}

/** ガントチャート上の配置ブロック（ドラッグ可能） */
export const AssignmentBlock: React.FC<AssignmentBlockProps> = ({
  assignment,
  role,
  member,
  left,
  width,
  rowHeight,
  violation,
  onClick,
  memberName,
  roleName,
}) => {
  const bgColor = role?.color ?? '#1976d2';
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/assignment-id', assignment.id);
    e.dataTransfer.setData('text/member-id', assignment.memberId);
    e.dataTransfer.setData('text/role-id', assignment.roleId);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 4, left: rect.left });
  };

  const handleMouseLeave = () => setPopoverPos(null);

  const hasReason = assignment.reason.text.length > 0;
  const outlineColor = violation ? violationOutlineColor(violation.type) : 'transparent';

  // ポップオーバー用の名前（propsから、なければrole/memberのfallback）
  const displayMemberName = memberName ?? member?.name ?? '';
  const displayRoleName = roleName ?? role?.name ?? '';

  return (
    <StyledBlock
      style={{
        left,
        width: Math.max(width - 2, 4),
        height: rowHeight - 8,
        top: 4,
        backgroundColor: bgColor,
        outlineColor,
        outlineWidth: violation ? 2 : 0,
        outlineStyle: violation ? 'solid' : 'none',
        outlineOffset: -2,
      }}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onClick?.(assignment.id);
      }}
    >
      <span className="e-label">{role?.name ?? member?.name ?? '?'}</span>
      {hasReason && (
        <span className="e-reason-dot">●</span>
      )}

      {/* F-3-2: ホバーポップオーバー（position:fixed で overflow:hidden を突き抜ける） */}
      {popoverPos && (
        <ReasonPopover
          assignment={assignment}
          memberName={displayMemberName}
          roleName={displayRoleName}
          top={popoverPos.top}
          left={popoverPos.left}
        />
      )}
    </StyledBlock>
  );
};

function violationOutlineColor(type: ConstraintViolation['type']): string {
  switch (type) {
    case 'duplicate_member_in_timeslot': return '#f44336';
    case 'outside_availability':         return '#ff9800';
    case 'skill_mismatch':               return '#ffc107';
    default:                             return '#9e9e9e';
  }
}


const StyledBlock = styled.div`
  position: absolute;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 6px;
  color: white;
  font-size: 0.8em;
  cursor: grab;
  overflow: hidden;
  white-space: nowrap;
  transition: box-shadow 0.15s;
  z-index: 2;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    z-index: 3;
  }

  .e-label {
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .e-reason-dot {
    font-size: 0.5em;
    opacity: 0.7;
    flex-shrink: 0;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean }>;
