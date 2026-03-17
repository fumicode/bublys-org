'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  TimeSlot,
  Task,
  Member,
  ShiftAssignment,
  MemberAssignmentEvaluation,
} from "../domain/index.js";

type MemberShiftTableViewProps = {
  timeSlots: readonly TimeSlot[];
  tasks: readonly Task[];
  assignments: readonly ShiftAssignment[];
  memberList: readonly Member[];
  onMemberClick?: (memberId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
};

export const MemberShiftTableView: FC<MemberShiftTableViewProps> = ({
  timeSlots,
  tasks,
  assignments,
  memberList,
  onMemberClick,
  onAssignmentClick,
}) => {
  const getAssignmentsForMember = (memberId: string) => {
    return assignments.filter((a) => a.staffId === memberId);
  };

  const getAssignmentForMemberAndTimeSlot = (memberId: string, timeSlotId: string) => {
    return assignments.find(
      (a) => a.staffId === memberId && a.timeSlotId === timeSlotId
    );
  };

  const calculateScore = (
    member: Member,
    assignment: ShiftAssignment
  ): number => {
    const task = tasks.find((t) => t.id === assignment.roleId);
    const timeSlot = timeSlots.find((t) => t.id === assignment.timeSlotId);
    if (!task || !timeSlot) return 0;

    const evaluation = MemberAssignmentEvaluation.evaluateCandidate(
      member,
      task,
      timeSlot
    );
    return evaluation.totalScore;
  };

  const getTaskName = (taskId: string): string => {
    return tasks.find((t) => t.id === taskId)?.name ?? "不明";
  };

  // 配置のある局員のみ表示
  const membersWithAssignments = memberList.filter(
    (member) => getAssignmentsForMember(member.id).length > 0
  );

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-member-header">局員</th>
          {timeSlots.map((slot) => (
            <th key={slot.id} className="e-slot-header">
              {slot.label}
            </th>
          ))}
          <th className="e-total-header">配置数</th>
        </tr>
      </thead>
      <tbody>
        {membersWithAssignments.map((member) => {
          const memberAssignments = getAssignmentsForMember(member.id);
          return (
            <tr key={member.id}>
              <td
                className="e-member-cell"
                onClick={() => onMemberClick?.(member.id)}
              >
                <div className="e-member-name">{member.name}</div>
                <div className="e-member-dept">{member.department}</div>
              </td>
              {timeSlots.map((slot) => {
                const assignment = getAssignmentForMemberAndTimeSlot(member.id, slot.id);
                const isAvailable = member.isAvailableAt(slot.id);

                return (
                  <td
                    key={slot.id}
                    className={`e-slot-cell ${isAvailable ? "is-available" : "is-unavailable"}`}
                  >
                    {!isAvailable && (
                      <div className="e-unavailable-mark">×</div>
                    )}
                    {assignment && (
                      <div
                        className={`e-assignment ${calculateScore(member, assignment) >= 0 ? "is-positive" : "is-negative"}`}
                        onClick={() => onAssignmentClick?.(assignment.id)}
                      >
                        <div className="e-task">
                          {getTaskName(assignment.roleId)}
                        </div>
                        <div className="e-score">
                          {calculateScore(member, assignment) >= 0 ? "+" : ""}
                          {calculateScore(member, assignment)}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
              <td className="e-total-cell">{memberAssignments.length}</td>
            </tr>
          );
        })}
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
    padding: 6px 8px;
    vertical-align: middle;
    text-align: center;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .e-member-header {
    width: 120px;
    min-width: 120px;
    text-align: left;
  }

  .e-slot-header {
    min-width: 80px;
    font-size: 0.85em;
  }

  .e-total-header {
    width: 60px;
    min-width: 60px;
  }

  .e-member-cell {
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;

    &:hover {
      background-color: #e3f2fd;
    }

    .e-member-name {
      font-weight: bold;
    }

    .e-member-dept {
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-slot-cell {
    min-width: 80px;
    position: relative;

    &.is-unavailable {
      background-color: #f5f5f5;
    }
  }

  .e-unavailable-mark {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 0.7em;
    color: #999;
  }

  .e-assignment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.8;
    }

    &.is-positive {
      background-color: #e8f5e9;
      border: 1px solid #a5d6a7;
    }

    &.is-negative {
      background-color: #ffebee;
      border: 1px solid #ef9a9a;
    }

    .e-task {
      font-weight: 500;
      font-size: 0.9em;
    }

    .e-score {
      font-size: 0.8em;
      font-weight: bold;
    }
  }

  .e-total-cell {
    font-weight: bold;
    background-color: #fafafa;
  }
`;
