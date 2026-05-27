'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Shift,
  Member,
  ShiftAssignment,
  MemberAssignmentEvaluation,
  type DayType,
} from "../domain/index.js";
import { DAY_TYPE_ORDER } from "../data/sampleData.js";

type MemberShiftTableViewProps = {
  shifts: readonly Shift[];
  assignments: readonly ShiftAssignment[];
  memberList: readonly Member[];
  onMemberClick?: (memberId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
};

export const MemberShiftTableView: FC<MemberShiftTableViewProps> = ({
  shifts,
  assignments,
  memberList,
  onMemberClick,
  onAssignmentClick,
}) => {
  const getAssignmentsForMember = (memberId: string) => {
    return assignments.filter((a) => a.staffId === memberId);
  };

  const getAssignmentsForMemberAndDayType = (memberId: string, dayType: DayType) => {
    const dayShiftIds = new Set(
      shifts.filter((s) => s.dayType === dayType).map((s) => s.id)
    );
    return assignments.filter(
      (a) => a.staffId === memberId && dayShiftIds.has(a.shiftId)
    );
  };

  const calculateScore = (member: Member, assignment: ShiftAssignment): number => {
    const shift = shifts.find((s) => s.id === assignment.shiftId);
    if (!shift) return 0;

    const evaluation = MemberAssignmentEvaluation.evaluateCandidate(member, shift);
    return evaluation.totalScore;
  };

  // 配置のある局員のみ表示
  const membersWithAssignments = memberList.filter(
    (member) => getAssignmentsForMember(member.id).length > 0
  );

  // 配置のある dayType のみ列に表示
  const activeDayTypes = DAY_TYPE_ORDER.filter((dt) =>
    assignments.some((a) => {
      const shift = shifts.find((s) => s.id === a.shiftId);
      return shift?.dayType === dt;
    })
  );

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-member-header">局員</th>
          {activeDayTypes.map((dt) => (
            <th key={dt} className="e-daytype-header">{dt}</th>
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
              {activeDayTypes.map((dayType) => {
                const dayAssignments = getAssignmentsForMemberAndDayType(member.id, dayType);
                return (
                  <td key={dayType} className="e-daytype-cell">
                    {dayAssignments.map((assignment) => {
                      const shift = shifts.find((s) => s.id === assignment.shiftId);
                      const score = calculateScore(member, assignment);
                      const isAvailable = shift ? member.isAvailableForShift(shift) : false;
                      return (
                        <div
                          key={assignment.id}
                          className={`e-assignment ${score >= 0 ? "is-positive" : "is-negative"} ${isAvailable ? "" : "is-unavailable"}`}
                          onClick={() => onAssignmentClick?.(assignment.id)}
                        >
                          <div className="e-task">
                            {shift?.taskName ?? assignment.shiftId}
                          </div>
                          <div className="e-time">
                            {shift ? `${shift.startTime}–${shift.endTime}` : ""}
                          </div>
                          <div className="e-score">
                            {score >= 0 ? "+" : ""}{score}pt
                          </div>
                        </div>
                      );
                    })}
                    {dayAssignments.length === 0 && (
                      <div className="e-empty-cell">—</div>
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
    vertical-align: top;
    text-align: left;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
    text-align: center;
  }

  .e-member-header {
    width: 120px;
    min-width: 120px;
    text-align: left;
  }

  .e-daytype-header {
    min-width: 130px;
  }

  .e-total-header {
    width: 60px;
    min-width: 60px;
    text-align: center;
  }

  .e-member-cell {
    cursor: pointer;
    transition: background-color 0.15s;

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

  .e-daytype-cell {
    vertical-align: top;
  }

  .e-empty-cell {
    text-align: center;
    color: #ccc;
    font-size: 0.9em;
  }

  .e-assignment {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s;
    margin-bottom: 4px;
    font-size: 0.9em;

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

    &.is-unavailable {
      opacity: 0.6;
      border-style: dashed;
    }

    .e-task {
      font-weight: 500;
    }

    .e-time {
      font-size: 0.78em;
      color: #666;
    }

    .e-score {
      font-size: 0.8em;
      font-weight: bold;
    }
  }

  .e-total-cell {
    font-weight: bold;
    background-color: #fafafa;
    text-align: center;
    vertical-align: middle;
  }
`;
