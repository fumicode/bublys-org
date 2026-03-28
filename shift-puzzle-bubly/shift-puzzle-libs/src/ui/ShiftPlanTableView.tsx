'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Shift,
  Member,
  ShiftAssignment,
  ConstraintViolation,
  MemberAssignmentEvaluation,
  type DayType,
} from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import { IconButton, Tooltip } from "@mui/material";
import { ObjectView, getDragType, DRAG_KEYS, setDragPayload } from "@bublys-org/bubbles-ui";
import { DAY_TYPE_ORDER } from "../data/sampleData.js";

type ShiftPlanTableViewProps = {
  shifts: readonly Shift[];
  assignments: readonly ShiftAssignment[];
  memberList: readonly Member[];
  violations?: readonly ConstraintViolation[];
  buildAssignmentUrl?: (assignmentId: string) => string;
  /** セルクリック時に開くバブルのURLを生成（origin-side配置用） */
  buildCellUrl?: (shiftId: string) => string;
  onDropMember?: (memberId: string, shiftId: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
  onMoveAssignment?: (assignmentId: string, memberId: string, shiftId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
  onCellClick?: (shiftId: string) => void;
};

export const ShiftPlanTableView: FC<ShiftPlanTableViewProps> = ({
  shifts,
  assignments,
  memberList,
  violations = [],
  buildAssignmentUrl,
  buildCellUrl,
  onDropMember,
  onRemoveAssignment,
  onMoveAssignment,
  onAssignmentClick,
  onCellClick,
}) => {
  const getMemberName = (memberId: string): string => {
    const member = memberList.find((m) => m.id === memberId);
    return member?.name ?? "不明";
  };

  const getMember = (memberId: string): Member | undefined => {
    return memberList.find((m) => m.id === memberId);
  };

  const getAssignmentsForShift = (shiftId: string) => {
    return assignments.filter((a) => a.shiftId === shiftId);
  };

  const getViolationForAssignment = (assignmentId: string): ConstraintViolation | undefined => {
    return violations.find((v) => v.assignmentIds.includes(assignmentId));
  };

  const calculateShiftScore = (shiftId: string): number => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return 0;

    const shiftAssignments = getAssignmentsForShift(shiftId);
    let score = 0;
    for (const assignment of shiftAssignments) {
      const member = getMember(assignment.staffId);
      if (member) {
        const evaluation = MemberAssignmentEvaluation.evaluateCandidate(member, shift);
        score += evaluation.totalScore;
      }
    }
    return score;
  };

  const handleDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    const memberDragType = getDragType("Member");
    const isInternalMove = types.includes("text/member-id");
    const isMemberDrag = types.includes(memberDragType);

    if (isInternalMove || isMemberDrag) {
      e.preventDefault();
      e.currentTarget.classList.add("is-drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("is-drag-over");
  };

  const handleDrop = (e: React.DragEvent, shiftId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("is-drag-over");

    const types = Array.from(e.dataTransfer.types);

    // 内部のセル間移動（配置チップのドラッグ）
    const internalMemberId = e.dataTransfer.getData("text/member-id");
    const assignmentId = e.dataTransfer.getData("text/assignment-id");

    if (assignmentId && internalMemberId && onMoveAssignment) {
      onMoveAssignment(assignmentId, internalMemberId, shiftId);
      return;
    }

    if (internalMemberId && !assignmentId && onDropMember) {
      onDropMember(internalMemberId, shiftId);
      return;
    }

    // ObjectViewからのドラッグ（独立バブルの局員一覧からの新規配置）
    const memberDragType = getDragType("Member");
    if (types.includes(memberDragType)) {
      const url = e.dataTransfer.getData(memberDragType) || e.dataTransfer.getData(DRAG_KEYS.url);
      // URLからmemberIdを抽出: "shift-puzzle/members/:id"
      const match = url.match(/shift-puzzle\/members?\/([^/?]+)/);
      if (match && onDropMember) {
        const memberId = match[1];
        onDropMember(memberId, shiftId);
      }
    }
  };

  const handleChipDragStart = (e: React.DragEvent, assignmentId: string, memberId: string, url: string, label: string) => {
    e.dataTransfer.setData("text/member-id", memberId);
    e.dataTransfer.setData("text/assignment-id", assignmentId);
    setDragPayload(e, { type: getDragType("ShiftAssignment"), url, label, objectId: assignmentId }, { effectAllowed: "copyMove" });
  };

  // dayTypeでグループ化
  const shiftsByDayType = shifts.reduce((acc, shift) => {
    if (!acc[shift.dayType]) {
      acc[shift.dayType] = [];
    }
    acc[shift.dayType].push(shift);
    return acc;
  }, {} as Record<DayType, Shift[]>);

  const dayTypes = DAY_TYPE_ORDER.filter((dt) => shiftsByDayType[dt]);

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-daytype-header">日程</th>
          <th className="e-shift-header">シフト</th>
          <th className="e-time-header">時間</th>
          <th className="e-count-header">人数</th>
          <th className="e-members-header">配置局員</th>
        </tr>
      </thead>
      <tbody>
        {dayTypes.map((dayType) =>
          shiftsByDayType[dayType].map((shift, shiftIdx) => {
            const shiftAssignments = getAssignmentsForShift(shift.id);
            const assignedCount = shiftAssignments.length;
            const requiredCount = shift.requiredCount;
            const hasRequirement = requiredCount > 0;
            const isFilled = assignedCount >= requiredCount;
            const isShortage = hasRequirement && assignedCount < shift.minCount;
            const isExcess = hasRequirement && assignedCount > shift.maxCount;
            const emptySlotCount = Math.max(0, requiredCount - assignedCount);
            const cellUrl = buildCellUrl?.(shift.id);
            const score = calculateShiftScore(shift.id);

            return (
              <tr key={shift.id}>
                {shiftIdx === 0 && (
                  <td rowSpan={shiftsByDayType[dayType].length} className="e-daytype-cell">
                    {dayType}
                  </td>
                )}
                <td className="e-shift-cell">
                  <div className="e-shift-name">{shift.taskName ?? shift.taskId}</div>
                  {shift.responsibleDepartment && (
                    <div className="e-shift-dept">{shift.responsibleDepartment}</div>
                  )}
                </td>
                <td className="e-time-cell">
                  {shift.startTime}–{shift.endTime}
                </td>
                <td className="e-count-cell">
                  {hasRequirement && (
                    <span className={`e-count ${isFilled ? "is-filled" : ""} ${isShortage ? "is-shortage" : ""} ${isExcess ? "is-excess" : ""}`}>
                      {assignedCount}/{requiredCount}
                    </span>
                  )}
                </td>
                <td
                  className="e-assignment-cell"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, shift.id)}
                >
                  <div className="e-cell-content">
                    {shiftAssignments.map((assignment) => {
                      const member = getMember(assignment.staffId);
                      const isAvailable = member?.isAvailableFor(shift.id) ?? false;
                      const violation = getViolationForAssignment(assignment.id);
                      const hasViolation = !!violation;
                      const assignmentUrl = buildAssignmentUrl?.(assignment.id) ?? `shift-puzzle/assignments/${assignment.id}`;
                      const memberName = getMemberName(assignment.staffId);
                      return (
                        <ObjectView
                          key={assignment.id}
                          type="ShiftAssignment"
                          url={assignmentUrl}
                          label={memberName}
                          draggable={false}
                          onClick={() => onAssignmentClick?.(assignment.id)}
                        >
                          <div
                            className={`e-member-chip ${isAvailable ? "is-available" : "is-unavailable"} ${hasViolation ? "has-violation" : ""}`}
                            draggable
                            onDragStart={(e) => handleChipDragStart(e, assignment.id, assignment.staffId, assignmentUrl, memberName)}
                          >
                            {hasViolation && (
                              <Tooltip title={violation.message} arrow>
                                <WarningIcon className="e-violation-icon" fontSize="inherit" />
                              </Tooltip>
                            )}
                            <span className="e-member-name">
                              <PersonIcon fontSize="inherit" />
                              {memberName}
                            </span>
                            <IconButton
                              size="small"
                              className="e-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveAssignment?.(assignment.id);
                              }}
                            >
                              <CloseIcon fontSize="inherit" />
                            </IconButton>
                          </div>
                        </ObjectView>
                      );
                    })}
                    {hasRequirement && (
                      <div
                        className={`e-empty-slot ${emptySlotCount === 0 ? "is-full" : ""}`}
                        data-url={cellUrl}
                        onClick={() => onCellClick?.(shift.id)}
                      >
                        <span className="e-empty-label">
                          {emptySlotCount > 0 ? `+ ${emptySlotCount}名追加` : "+ 追加"}
                        </span>
                      </div>
                    )}
                    {shiftAssignments.length > 0 && (
                      <div className={`e-score ${score >= 0 ? "is-positive" : "is-negative"}`}>
                        {score > 0 ? "+" : ""}{score}pt
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </StyledTable>
  );
};

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: 0.85em;
  width: 100%;

  th,
  td {
    border: 1px solid #ddd;
    padding: 4px 6px;
    vertical-align: top;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .e-daytype-header {
    width: 70px;
    min-width: 70px;
  }

  .e-shift-header {
    min-width: 120px;
  }

  .e-time-header {
    width: 100px;
    min-width: 100px;
  }

  .e-count-header {
    width: 60px;
    min-width: 60px;
  }

  .e-members-header {
    min-width: 200px;
  }

  .e-daytype-cell {
    font-weight: bold;
    background-color: #fafafa;
    text-align: center;
    vertical-align: middle;
  }

  .e-shift-cell {
    .e-shift-name {
      font-weight: bold;
      font-size: 0.9em;
    }

    .e-shift-dept {
      font-size: 0.75em;
      color: #888;
    }
  }

  .e-time-cell {
    text-align: center;
    white-space: nowrap;
    color: #555;
    font-size: 0.85em;
  }

  .e-count-cell {
    text-align: center;

    .e-count {
      font-size: 0.85em;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0,0,0,0.05);

      &.is-filled {
        color: #4caf50;
      }

      &.is-shortage {
        color: #f44336;
      }

      &.is-excess {
        color: #ff9800;
      }
    }
  }

  .e-assignment-cell {
    min-height: 40px;
    transition: background-color 0.15s;

    &.is-drag-over {
      background-color: #e3f2fd;
    }
  }

  .e-cell-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .e-empty-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    border: 1px dashed #ccc;
    border-radius: 4px;
    background-color: #fafafa;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;

    &:hover {
      background-color: #e3f2fd;
      border-color: #1976d2;
    }

    .e-empty-label {
      font-size: 0.8em;
      color: #888;
      white-space: nowrap;
    }

    &:hover .e-empty-label {
      color: #1976d2;
    }

    &.is-full {
      border-style: dotted;
      background-color: transparent;
      padding: 2px 6px;

      .e-empty-label {
        font-size: 0.7em;
        color: #aaa;
      }
    }
  }

  .e-member-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 0.85em;
    cursor: grab;
    transition: opacity 0.15s, box-shadow 0.15s;

    &:active {
      cursor: grabbing;
    }

    &[draggable="true"]:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    &.is-available {
      background-color: #e8f5e9;
      border: 1px solid #a5d6a7;
    }

    &.is-unavailable {
      background-color: #ffebee;
      border: 1px solid #ef9a9a;
    }

    &.has-violation {
      border: 2px solid #ff9800;
      background-color: #fff3e0;
      animation: violation-pulse 1.5s ease-in-out infinite;
    }

    .e-violation-icon {
      color: #ff9800;
      margin-right: 2px;
      font-size: 1em;
    }

    .e-member-name {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .e-remove-btn {
      padding: 0;
      font-size: 0.9em;
    }
  }

  .e-score {
    font-size: 0.75em;
    font-weight: bold;

    &.is-positive {
      color: #2e7d32;
    }

    &.is-negative {
      color: #c62828;
    }
  }

  @keyframes violation-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.2);
    }
  }
`;
