'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  TimeSlot_時間帯,
  Role_係,
  Staff_スタッフ,
  ShiftAssignment_シフト配置,
  ConstraintViolation,
  StaffAssignmentEvaluation_スタッフ配置評価,
} from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import { IconButton, Tooltip } from "@mui/material";
import { ObjectView, getDragType, DRAG_KEYS, setDragPayload } from "@bublys-org/bubbles-ui";

type ShiftPlanTableViewProps = {
  timeSlots: readonly TimeSlot_時間帯[];
  roles: readonly Role_係[];
  assignments: readonly ShiftAssignment_シフト配置[];
  staffList: readonly Staff_スタッフ[];
  violations?: readonly ConstraintViolation[];
  buildAssignmentUrl?: (assignmentId: string) => string;
  /** セルクリック時に開くバブルのURLを生成（origin-side配置用） */
  buildCellUrl?: (timeSlotId: string, roleId: string) => string;
  onDropStaff?: (staffId: string, timeSlotId: string, roleId: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
  onMoveAssignment?: (assignmentId: string, staffId: string, timeSlotId: string, roleId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
  onCellClick?: (timeSlotId: string, roleId: string) => void;
};

export const ShiftPlanTableView: FC<ShiftPlanTableViewProps> = ({
  timeSlots,
  roles,
  assignments,
  staffList,
  violations = [],
  buildAssignmentUrl,
  buildCellUrl,
  onDropStaff,
  onRemoveAssignment,
  onMoveAssignment,
  onAssignmentClick,
  onCellClick,
}) => {
  const getStaffName = (staffId: string): string => {
    const staff = staffList.find((s) => s.id === staffId);
    return staff?.name ?? "不明";
  };

  const getStaff = (staffId: string): Staff_スタッフ | undefined => {
    return staffList.find((s) => s.id === staffId);
  };

  const getAssignmentsForCell = (timeSlotId: string, roleId: string) => {
    return assignments.filter(
      (a) => a.timeSlotId === timeSlotId && a.roleId === roleId
    );
  };

  /** 配置が制約違反に含まれているかチェック */
  const getViolationForAssignment = (assignmentId: string): ConstraintViolation | undefined => {
    return violations.find((v) => v.assignmentIds.includes(assignmentId));
  };

  const calculateCellScore = (timeSlotId: string, roleId: string): number => {
    const cellAssignments = getAssignmentsForCell(timeSlotId, roleId);
    const role = roles.find((r) => r.id === roleId);
    const timeSlot = timeSlots.find((t) => t.id === timeSlotId);
    if (!role || !timeSlot) return 0;

    let score = 0;
    for (const assignment of cellAssignments) {
      const staff = getStaff(assignment.staffId);
      if (staff) {
        // StaffAssignmentEvaluationで評価
        const evaluation = StaffAssignmentEvaluation_スタッフ配置評価.evaluateCandidate(
          staff,
          role,
          timeSlot
        );
        score += evaluation.totalScore;
      }
    }
    return score;
  };

  const handleDragOver = (e: React.DragEvent) => {
    // 内部のセル間移動またはObjectViewからのStaffドラッグを受け入れる
    const types = Array.from(e.dataTransfer.types);
    const staffDragType = getDragType("Staff");
    const isInternalMove = types.includes("text/staff-id");
    const isStaffDrag = types.includes(staffDragType);

    console.log("[DragOver] types:", types, "staffDragType:", staffDragType, "isInternalMove:", isInternalMove, "isStaffDrag:", isStaffDrag);

    if (isInternalMove || isStaffDrag) {
      e.preventDefault();
      e.currentTarget.classList.add("is-drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("is-drag-over");
  };

  const handleDrop = (e: React.DragEvent, timeSlotId: string, roleId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("is-drag-over");

    const types = Array.from(e.dataTransfer.types);
    console.log("[Drop] types:", types);

    // 内部のセル間移動（配置チップのドラッグ）
    const internalStaffId = e.dataTransfer.getData("text/staff-id");
    const assignmentId = e.dataTransfer.getData("text/assignment-id");

    console.log("[Drop] internalStaffId:", internalStaffId, "assignmentId:", assignmentId);

    if (assignmentId && internalStaffId && onMoveAssignment) {
      // 既存配置の移動
      onMoveAssignment(assignmentId, internalStaffId, timeSlotId, roleId);
      return;
    }

    if (internalStaffId && !assignmentId && onDropStaff) {
      // ShiftPlanEditor内スタッフ一覧からの新規配置
      console.log("[Drop] internal new assignment, staffId:", internalStaffId);
      onDropStaff(internalStaffId, timeSlotId, roleId);
      return;
    }

    // ObjectViewからのドラッグ（独立バブルのスタッフ一覧からの新規配置）
    const staffDragType = getDragType("Staff");
    if (types.includes(staffDragType)) {
      // staffDragType自体にURLが設定されている
      const url = e.dataTransfer.getData(staffDragType) || e.dataTransfer.getData(DRAG_KEYS.url);
      console.log("[Drop] staffDragType found, url:", url);
      // URLからstaffIdを抽出: "shift-puzzle/staffs/:id"
      const match = url.match(/shift-puzzle\/staffs?\/([^/]+)/);
      console.log("[Drop] match:", match);
      if (match && onDropStaff) {
        const staffId = match[1];
        console.log("[Drop] calling onDropStaff with staffId:", staffId);
        onDropStaff(staffId, timeSlotId, roleId);
      }
    }
  };

  const handleChipDragStart = (e: React.DragEvent, assignmentId: string, staffId: string, url: string, label: string) => {
    // セル間移動用の独自データ
    e.dataTransfer.setData("text/staff-id", staffId);
    e.dataTransfer.setData("text/assignment-id", assignmentId);
    // ポケット等の汎用ドロップ先で認識できるようにする（copyMove でセル間移動とポケットへのコピー両方を許可）
    setDragPayload(e, { type: getDragType("ShiftAssignment"), url, label, objectId: assignmentId }, { effectAllowed: "copyMove" });
  };

  // 日付でグループ化
  const slotsByDate = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot_時間帯[]>);

  const dates = Object.keys(slotsByDate).sort();

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-date-header">日付</th>
          <th className="e-slot-header">時間帯</th>
          {roles.map((role) => (
            <th key={role.id} className="e-role-header">
              <div className="e-role-name">{role.name}</div>
              <div className="e-role-fixedness">
                {Role_係.getFixednessLabel(role.fixedness)}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dates.map((date) =>
          slotsByDate[date].map((slot, slotIdx) => (
            <tr key={slot.id}>
              {slotIdx === 0 && (
                <td rowSpan={slotsByDate[date].length} className="e-date-cell">
                  {formatDate(date)}
                </td>
              )}
              <td className="e-slot-cell">
                <div className="e-slot-label">{slot.label.split(" ")[1]}</div>
                <div className="e-slot-time">
                  {slot.state.startTime} - {slot.state.endTime}
                </div>
              </td>
              {roles.map((role) => {
                const cellAssignments = getAssignmentsForCell(slot.id, role.id);
                const score = calculateCellScore(slot.id, role.id);
                const requirement = slot.getRequirementForRole(role.id);
                const requiredCount = requirement?.requiredCount ?? 0;
                const assignedCount = cellAssignments.length;
                const hasRequirement = requiredCount > 0;
                const isFilled = assignedCount >= requiredCount;
                const isShortage = hasRequirement && assignedCount < (requirement?.minCount ?? requiredCount);
                const isExcess = hasRequirement && assignedCount > (requirement?.maxCount ?? requiredCount);

                // 空き枠の数を計算
                const emptySlotCount = Math.max(0, requiredCount - assignedCount);
                const cellUrl = buildCellUrl?.(slot.id, role.id);

                return (
                  <td
                    key={`${slot.id}_${role.id}`}
                    className={`e-assignment-cell ${!hasRequirement ? "no-requirement" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, slot.id, role.id)}
                  >
                    <div className="e-cell-content">
                      {hasRequirement && (
                        <div className={`e-requirement ${isFilled ? "is-filled" : ""} ${isShortage ? "is-shortage" : ""} ${isExcess ? "is-excess" : ""}`}>
                          {assignedCount}/{requiredCount}
                        </div>
                      )}
                      {cellAssignments.map((assignment) => {
                        const staff = getStaff(assignment.staffId);
                        const isAvailable = staff?.isAvailableAt(slot.id) ?? false;
                        const violation = getViolationForAssignment(assignment.id);
                        const hasViolation = !!violation;
                        const assignmentUrl = buildAssignmentUrl?.(assignment.id) ?? `shift-puzzle/assignments/${assignment.id}`;
                        const staffName = getStaffName(assignment.staffId);
                        return (
                          <ObjectView
                            key={assignment.id}
                            type="ShiftAssignment"
                            url={assignmentUrl}
                            label={staffName}
                            draggable={false}
                            onClick={() => onAssignmentClick?.(assignment.id)}
                          >
                            <div
                              className={`e-staff-chip ${isAvailable ? "is-available" : "is-unavailable"} ${hasViolation ? "has-violation" : ""}`}
                              draggable
                              onDragStart={(e) => handleChipDragStart(e, assignment.id, assignment.staffId, assignmentUrl, staffName)}
                            >
                              {hasViolation && (
                                <Tooltip title={violation.message} arrow>
                                  <WarningIcon className="e-violation-icon" fontSize="inherit" />
                                </Tooltip>
                              )}
                              <span className="e-staff-name">
                                <PersonIcon fontSize="inherit" />
                                {staffName}
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
                      {/* 空き枠のプレースホルダー（必ず1つ以上表示） */}
                      {hasRequirement && (
                        <div
                          className={`e-empty-slot ${emptySlotCount === 0 ? "is-full" : ""}`}
                          data-url={cellUrl}
                          onClick={() => onCellClick?.(slot.id, role.id)}
                        >
                          <span className="e-empty-label">
                            {emptySlotCount > 0 ? `+ ${emptySlotCount}名追加` : "+ 追加"}
                          </span>
                        </div>
                      )}
                      {cellAssignments.length > 0 && (
                        <div className={`e-score ${score >= 0 ? "is-positive" : "is-negative"}`}>
                          {score > 0 ? "+" : ""}{score}pt
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </StyledTable>
  );
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
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

  .e-date-header,
  .e-slot-header {
    width: 80px;
    min-width: 80px;
  }

  .e-role-header {
    min-width: 100px;

    .e-role-name {
      font-size: 0.9em;
    }

    .e-role-fixedness {
      font-size: 0.7em;
      color: #888;
      font-weight: normal;
    }
  }

  .e-date-cell {
    font-weight: bold;
    background-color: #fafafa;
    text-align: center;
    vertical-align: middle;
  }

  .e-slot-cell {
    text-align: center;

    .e-slot-label {
      font-weight: bold;
    }

    .e-slot-time {
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-assignment-cell {
    min-height: 60px;
    transition: background-color 0.15s;

    &.is-drag-over {
      background-color: #e3f2fd;
    }

    &.no-requirement {
      background-color: #fafafa;
    }
  }

  .e-cell-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-empty-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
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

  .e-requirement {
    font-size: 0.65em;
    color: #999;
    text-align: right;
    font-weight: 500;
    line-height: 1;

    &.is-filled {
      color: #4caf50;
    }

    &.is-shortage {
      color: #f44336;
      font-weight: bold;
    }

    &.is-excess {
      color: #ff9800;
    }
  }

  .e-staff-chip {
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

    .e-staff-name {
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
    text-align: right;
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
