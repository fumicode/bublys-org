'use client';

import { FC, useMemo, useRef } from "react";
import styled from "styled-components";
import {
  TimeSlot_時間帯,
  Role_係,
  Staff_スタッフ,
  ShiftAssignment_シフト配置,
  ConstraintViolation,
  TimelineScale_タイムラインスケール,
} from "../domain/index.js";
import WarningIcon from "@mui/icons-material/Warning";
import { Tooltip } from "@mui/material";
import { getDragType, DRAG_KEYS } from "@bublys-org/bubbles-ui";

// ========== 色パレット ==========

const ROLE_COLORS = [
  "#1976d2", // blue
  "#388e3c", // green
  "#d32f2f", // red
  "#7b1fa2", // purple
  "#f57c00", // orange
  "#00796b", // teal
  "#c2185b", // pink
  "#455a64", // blue-grey
  "#5d4037", // brown
  "#afb42b", // lime
];

const getRoleColor = (roleId: string, roles: readonly Role_係[]): string => {
  const index = roles.findIndex((r) => r.id === roleId);
  return ROLE_COLORS[index % ROLE_COLORS.length];
};

// ========== Props ==========

type GanttTimelineViewProps = {
  timeSlots: readonly TimeSlot_時間帯[];
  roles: readonly Role_係[];
  assignments: readonly ShiftAssignment_シフト配置[];
  staffList: readonly Staff_スタッフ[];
  violations?: readonly ConstraintViolation[];
  axisMode: "staff" | "role";
  pixelsPerHour?: number;
  rowHeight?: number;
  onDropStaff?: (staffId: string, timeSlotId: string, roleId: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
  onMoveAssignment?: (assignmentId: string, staffId: string, timeSlotId: string, roleId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
  onCellClick?: (timeSlotId: string, roleId: string) => void;
};

export const GanttTimelineView: FC<GanttTimelineViewProps> = ({
  timeSlots,
  roles,
  assignments,
  staffList,
  violations = [],
  axisMode,
  pixelsPerHour = 40,
  rowHeight = 36,
  onDropStaff,
  onMoveAssignment,
  onAssignmentClick,
  onCellClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scale = useMemo(
    () => TimelineScale_タイムラインスケール.fromTimeSlots(timeSlots, pixelsPerHour),
    [timeSlots, pixelsPerHour]
  );

  const dayBoundaries = useMemo(() => scale.getDayBoundaries(), [scale]);

  const getStaffName = (staffId: string): string => {
    const staff = staffList.find((s) => s.id === staffId);
    return staff?.name ?? "不明";
  };

  const getRoleName = (roleId: string): string => {
    const role = roles.find((r) => r.id === roleId);
    return role?.name ?? "不明";
  };

  const getViolation = (assignmentId: string): ConstraintViolation | undefined => {
    return violations.find((v) => v.assignmentIds.includes(assignmentId));
  };

  // ========== 行データの構築 ==========

  type RowData = {
    id: string;
    label: string;
    bars: Array<{
      assignment: ShiftAssignment_シフト配置;
      barLabel: string;
      color: string;
      x: number;
      width: number;
    }>;
  };

  const rows = useMemo<RowData[]>(() => {
    if (axisMode === "role") {
      return buildRoleRows();
    }
    return buildStaffRows();
  }, [axisMode, assignments, staffList, roles, timeSlots, scale]);

  function buildRoleRows(): RowData[] {
    const result: RowData[] = [];

    for (const role of roles) {
      const roleAssignments = assignments.filter((a) => a.roleId === role.id);
      // 各配置をサブ行（同じTimeSlot内で重なる場合は積み重ね）に分配
      const bars = roleAssignments.map((assignment) => {
        const slot = timeSlots.find((s) => s.id === assignment.timeSlotId);
        const rect = slot ? scale.getBarRect(slot) : { x: 0, width: 0 };
        return {
          assignment,
          barLabel: getStaffName(assignment.staffId),
          color: getRoleColor(role.id, roles),
          x: rect.x,
          width: rect.width,
        };
      });

      // サブ行に分配（重なりチェック）
      const subRows = distributeToSubRows(bars);
      if (subRows.length === 0) {
        result.push({ id: role.id, label: role.name, bars: [] });
      } else {
        for (let i = 0; i < subRows.length; i++) {
          result.push({
            id: `${role.id}_sub${i}`,
            label: i === 0 ? role.name : "",
            bars: subRows[i],
          });
        }
      }
    }

    return result;
  }

  function buildStaffRows(): RowData[] {
    // 配置のあるスタッフのみ表示
    const staffIds = [...new Set(assignments.map((a) => a.staffId))];
    return staffIds.map((staffId) => {
      const staffAssignments = assignments.filter((a) => a.staffId === staffId);
      const bars = staffAssignments.map((assignment) => {
        const slot = timeSlots.find((s) => s.id === assignment.timeSlotId);
        const rect = slot ? scale.getBarRect(slot) : { x: 0, width: 0 };
        return {
          assignment,
          barLabel: getRoleName(assignment.roleId),
          color: getRoleColor(assignment.roleId, roles),
          x: rect.x,
          width: rect.width,
        };
      });
      return {
        id: staffId,
        label: getStaffName(staffId),
        bars,
      };
    });
  }

  /** 重なるバーをサブ行に分配 */
  function distributeToSubRows<T extends { x: number; width: number }>(bars: T[]): T[][] {
    const subRows: T[][] = [];
    for (const bar of bars) {
      let placed = false;
      for (const subRow of subRows) {
        const overlaps = subRow.some(
          (existing) => bar.x < existing.x + existing.width && bar.x + bar.width > existing.x
        );
        if (!overlaps) {
          subRow.push(bar);
          placed = true;
          break;
        }
      }
      if (!placed) {
        subRows.push([bar]);
      }
    }
    return subRows;
  }

  // ========== ドラッグ&ドロップ ==========

  const handleDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    const staffDragType = getDragType("Staff");
    const isInternalMove = types.includes("text/staff-id");
    const isStaffDrag = types.includes(staffDragType);

    if (isInternalMove || isStaffDrag) {
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();

    if (axisMode !== "role") return;

    // ピクセル位置→TimeSlot特定
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const px = e.clientX - rect.left + scrollEl.scrollLeft;
    const targetSlot = scale.findClosestTimeSlot(px, timeSlots);
    if (!targetSlot) return;

    // rowIdからroleIdを抽出（_subN接尾辞を除去）
    const roleId = rowId.replace(/_sub\d+$/, "");

    const types = Array.from(e.dataTransfer.types);

    // 内部セル間移動
    const internalStaffId = e.dataTransfer.getData("text/staff-id");
    const assignmentId = e.dataTransfer.getData("text/assignment-id");

    if (assignmentId && internalStaffId && onMoveAssignment) {
      onMoveAssignment(assignmentId, internalStaffId, targetSlot.id, roleId);
      return;
    }

    if (internalStaffId && !assignmentId && onDropStaff) {
      onDropStaff(internalStaffId, targetSlot.id, roleId);
      return;
    }

    // ObjectViewからのドラッグ
    const staffDragType = getDragType("Staff");
    if (types.includes(staffDragType)) {
      const url = e.dataTransfer.getData(staffDragType) || e.dataTransfer.getData(DRAG_KEYS.url);
      const match = url.match(/shift-puzzle\/staffs?\/([^/]+)/);
      if (match && onDropStaff) {
        onDropStaff(match[1], targetSlot.id, roleId);
      }
    }
  };

  const handleBarDragStart = (e: React.DragEvent, assignmentId: string, staffId: string) => {
    e.dataTransfer.setData("text/staff-id", staffId);
    e.dataTransfer.setData("text/assignment-id", assignmentId);
    e.dataTransfer.effectAllowed = "move";
  };

  // ========== ヘッダー時刻目盛りの生成 ==========

  const hourMarkers = useMemo(() => {
    const markers: Array<{ x: number; label: string }> = [];
    for (const day of scale.state.days) {
      // 2時間刻みで目盛りを表示
      for (let m = day.startMinutes; m <= day.endMinutes; m += 120) {
        const h = Math.floor(m / 60);
        const timeStr = `${String(h).padStart(2, "0")}:00`;
        const px = scale.timeToPixel(day.date, timeStr);
        markers.push({ x: px, label: `${h}` });
      }
    }
    return markers;
  }, [scale]);

  return (
    <StyledGantt>
      {/* ヘッダー行 */}
      <div className="e-header-row">
        <div className="e-label-header" />
        <div className="e-timeline-header" style={{ width: scale.totalWidth }}>
          {/* 日付ラベル */}
          <div className="e-date-labels">
            {dayBoundaries.map((day) => (
              <div
                key={day.date}
                className="e-date-label"
                style={{ left: day.x, width: day.width }}
              >
                {formatDate(day.date)}
              </div>
            ))}
          </div>
          {/* 時刻目盛り */}
          <div className="e-time-markers">
            {hourMarkers.map((m, i) => (
              <div key={i} className="e-time-marker" style={{ left: m.x }}>
                <span className="e-time-text">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* データ行 */}
      <div className="e-body" ref={scrollRef}>
        <div className="e-rows-container">
          {/* 固定ラベル列 */}
          <div className="e-label-column">
            {rows.map((row) => (
              <div key={row.id} className="e-row-label">
                {row.label}
              </div>
            ))}
          </div>

          {/* タイムライン列 */}
          <div className="e-timeline-column" style={{ width: scale.totalWidth }}>
            {/* 日付境界の背景ストライプ */}
            {dayBoundaries.map((day, i) => (
              <div
                key={day.date}
                className={`e-day-stripe ${i % 2 === 0 ? "is-even" : "is-odd"}`}
                style={{
                  left: day.x,
                  width: day.width,
                  height: rows.length * rowHeight,
                }}
              />
            ))}

            {/* 行ごとのバーとドロップゾーン */}
            {rows.map((row) => (
              <div
                key={row.id}
                className="e-row-timeline"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, row.id)}
                onClick={(e) => {
                  if (axisMode === "role" && onCellClick) {
                    const scrollEl = scrollRef.current;
                    if (!scrollEl) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const px = e.clientX - rect.left + scrollEl.scrollLeft;
                    const slot = scale.findClosestTimeSlot(px, timeSlots);
                    if (slot) {
                      const roleId = row.id.replace(/_sub\d+$/, "");
                      onCellClick(slot.id, roleId);
                    }
                  }
                }}
              >
                {row.bars.map(({ assignment, barLabel, color, x, width }) => {
                  const violation = getViolation(assignment.id);
                  return (
                    <div
                      key={assignment.id}
                      className={`e-bar ${violation ? "has-violation" : ""}`}
                      style={{
                        left: x,
                        width: Math.max(width, 2),
                        backgroundColor: color,
                      }}
                      draggable
                      onDragStart={(e) =>
                        handleBarDragStart(e, assignment.id, assignment.staffId)
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignmentClick?.(assignment.id);
                      }}
                      title={`${barLabel} (${assignment.timeSlotId})`}
                    >
                      {violation && (
                        <Tooltip title={violation.message} arrow>
                          <WarningIcon className="e-violation-icon" fontSize="inherit" />
                        </Tooltip>
                      )}
                      <span className="e-bar-label">{barLabel}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </StyledGantt>
  );
};

// ========== ヘルパー ==========

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
};

// ========== スタイル ==========

const StyledGantt = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.85em;

  .e-header-row {
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid #ccc;
    height: 48px;
  }

  .e-label-header {
    width: 120px;
    min-width: 120px;
    background-color: #f5f5f5;
    border-right: 1px solid #ddd;
  }

  .e-timeline-header {
    position: relative;
    overflow: hidden;
    height: 100%;
  }

  .e-date-labels {
    position: absolute;
    top: 0;
    left: 0;
    height: 24px;
    width: 100%;
  }

  .e-date-label {
    position: absolute;
    top: 0;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.9em;
    background-color: #e8eaf6;
    border-right: 1px solid #c5cae9;
    box-sizing: border-box;
  }

  .e-time-markers {
    position: absolute;
    top: 24px;
    left: 0;
    height: 24px;
    width: 100%;
  }

  .e-time-marker {
    position: absolute;
    top: 0;
    height: 24px;
    border-left: 1px solid #e0e0e0;

    .e-time-text {
      font-size: 0.75em;
      color: #888;
      padding-left: 2px;
    }
  }

  .e-body {
    flex: 1;
    overflow: auto;
    display: flex;
  }

  .e-rows-container {
    display: flex;
    min-width: 100%;
  }

  .e-label-column {
    width: 120px;
    min-width: 120px;
    flex-shrink: 0;
    position: sticky;
    left: 0;
    z-index: 5;
    background-color: #fafafa;
    border-right: 1px solid #ddd;
  }

  .e-row-label {
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    border-bottom: 1px solid #eee;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9em;
  }

  .e-timeline-column {
    position: relative;
    min-height: 100%;
  }

  .e-day-stripe {
    position: absolute;
    top: 0;

    &.is-even {
      background-color: rgba(0, 0, 0, 0.01);
    }

    &.is-odd {
      background-color: rgba(0, 0, 0, 0.03);
    }
  }

  .e-row-timeline {
    position: relative;
    height: 36px;
    border-bottom: 1px solid #eee;
    cursor: pointer;

    &:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }
  }

  .e-bar {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    border-radius: 3px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px;
    color: white;
    cursor: grab;
    overflow: hidden;
    white-space: nowrap;
    transition: opacity 0.15s, box-shadow 0.15s;
    font-size: 0.85em;
    z-index: 2;

    &:active {
      cursor: grabbing;
    }

    &:hover {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      z-index: 3;
    }

    &.has-violation {
      outline: 2px solid #ff9800;
      outline-offset: -2px;
    }

    .e-violation-icon {
      color: #ffeb3b;
      font-size: 1em;
      flex-shrink: 0;
    }

    .e-bar-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
