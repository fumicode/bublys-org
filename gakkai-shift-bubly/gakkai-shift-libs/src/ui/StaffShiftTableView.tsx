'use client';

import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import {
  TimeSlot_時間帯,
  Role_係,
  Staff_スタッフ,
  ShiftAssignment_シフト配置,
  StaffAssignmentEvaluation_スタッフ配置評価,
} from "../domain/index.js";

type StaffShiftTableViewProps = {
  timeSlots: readonly TimeSlot_時間帯[];
  roles: readonly Role_係[];
  assignments: readonly ShiftAssignment_シフト配置[];
  staffList: readonly Staff_スタッフ[];
  /** スタッフのURLを生成（ダブルクリックで開く先） */
  buildStaffUrl: (staffId: string) => string;
  /** 配置のURLを生成（ダブルクリックで開く先） */
  buildAssignmentUrl: (assignmentId: string) => string;
};

export const StaffShiftTableView: FC<StaffShiftTableViewProps> = ({
  timeSlots,
  roles,
  assignments,
  staffList,
  buildStaffUrl,
  buildAssignmentUrl,
}) => {
  // スタッフごとの配置を取得
  const getAssignmentsForStaff = (staffId: string) => {
    return assignments.filter((a) => a.staffId === staffId);
  };

  // 特定のスタッフ・時間帯の配置を取得
  const getAssignmentForStaffAndTimeSlot = (staffId: string, timeSlotId: string) => {
    return assignments.find(
      (a) => a.staffId === staffId && a.timeSlotId === timeSlotId
    );
  };

  // 評価スコアを計算
  const calculateScore = (
    staff: Staff_スタッフ,
    assignment: ShiftAssignment_シフト配置
  ): number => {
    const role = roles.find((r) => r.id === assignment.roleId);
    const timeSlot = timeSlots.find((t) => t.id === assignment.timeSlotId);
    if (!role || !timeSlot) return 0;

    const evaluation = StaffAssignmentEvaluation_スタッフ配置評価.evaluateCandidate(
      staff,
      role,
      timeSlot
    );
    return evaluation.roleFitScore;
  };

  // 係名を取得
  const getRoleName = (roleId: string): string => {
    return roles.find((r) => r.id === roleId)?.name ?? "不明";
  };

  // 配置のあるスタッフのみ表示
  const staffWithAssignments = staffList.filter(
    (staff) => getAssignmentsForStaff(staff.id).length > 0
  );

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-staff-header">スタッフ</th>
          {timeSlots.map((slot) => (
            <th key={slot.id} className="e-slot-header">
              {slot.label}
            </th>
          ))}
          <th className="e-total-header">配置数</th>
        </tr>
      </thead>
      <tbody>
        {staffWithAssignments.map((staff) => {
          const staffAssignments = getAssignmentsForStaff(staff.id);
          return (
            <tr key={staff.id}>
              {/* <td> 自体は包まない（table の中に span が入ると
                  ブラウザの table fixup で表の外へ弾き出される）。中身だけ包む */}
              <td className="e-staff-cell" title="ダブルクリックでスタッフを開く">
                <ObjectView
                  type="Staff"
                  url={buildStaffUrl(staff.id)}
                  label={staff.name}
                  openingPosition="bubble-side-right"
                  fullWidth
                  className="e-staff-body"
                >
                  <div className="e-staff-name">{staff.name}</div>
                  <div className="e-staff-school">{staff.state.school}</div>
                </ObjectView>
              </td>
              {timeSlots.map((slot) => {
                const assignment = getAssignmentForStaffAndTimeSlot(staff.id, slot.id);
                const isAvailable = staff.isAvailableAt(slot.id);

                return (
                  <td
                    key={slot.id}
                    className={`e-slot-cell ${isAvailable ? "is-available" : "is-unavailable"}`}
                  >
                    {!isAvailable && (
                      <div className="e-unavailable-mark">×</div>
                    )}
                    {assignment && (
                      <ObjectView
                        type="ShiftAssignment"
                        url={buildAssignmentUrl(assignment.id)}
                        label={`${staff.name} / ${getRoleName(assignment.roleId)}`}
                        openingPosition="origin-side"
                        fullWidth
                        className={`e-assignment ${calculateScore(staff, assignment) >= 0 ? "is-positive" : "is-negative"}`}
                      >
                        <div className="e-role">
                          {getRoleName(assignment.roleId)}
                        </div>
                        <div className="e-score">
                          {calculateScore(staff, assignment) >= 0 ? "+" : ""}
                          {calculateScore(staff, assignment)}
                        </div>
                      </ObjectView>
                    )}
                  </td>
                );
              })}
              <td className="e-total-cell">{staffAssignments.length}</td>
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

  .e-staff-header {
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

  .e-staff-cell {
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;

    &:hover {
      background-color: #e3f2fd;
    }

    /* ObjectView のラッパ span は display:flex（fullWidth）。
       元の <td> 直下の block 積みと同じ見た目にするため、縦積みに戻す */
    .e-staff-body {
      flex-direction: column;
      align-items: flex-start;
    }

    .e-staff-name {
      font-weight: bold;
    }

    .e-staff-school {
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

    .e-role {
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
