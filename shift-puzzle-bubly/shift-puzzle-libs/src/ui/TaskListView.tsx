'use client';

import { FC } from "react";
import styled from "styled-components";
import { type Shift } from "../domain/index.js";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { ObjectView } from "@bublys-org/bubbles-ui";

/** ガント側がタスク種別のドラッグを判別するためのMIME（ObjectView 'Task' と同一） */
export const DRAG_TYPE_TASK = 'type/task';

/**
 * モジュール変数: ドラッグ中のtaskId。
 * HTML5 DnD制約（dragover中にgetData不可）を回避するため、
 * ガントView/Editorはこれを直接参照してghost/可否表示に使う。
 */
export let draggingTaskId: string | null = null;

/** タスクとそのシフト一覧をまとめたグループ型 */
export type GroupedTask = {
  taskId: string;
  taskName: string;
  department: string;
  shifts: Shift[];
};

type TaskListViewProps = {
  tasks: GroupedTask[];
  selectedTaskId?: string | null;
  buildDetailUrl: (taskId: string) => string;
  onTaskClick?: (taskId: string) => void;
  activeDayType?: string;
};

/** dayType 略称 */
const DAY_SHORT: Record<string, string> = {
  '準準備日': '準々',
  '準備日':   '準備',
  '1日目':    '1日',
  '2日目':    '2日',
  '片付け日': '片付',
};

export const TaskListView: FC<TaskListViewProps> = ({
  tasks,
  selectedTaskId,
  buildDetailUrl,
  onTaskClick,
  activeDayType,
}) => {
  return (
    <StyledTaskList>
      {tasks.length === 0 ? (
        <li className="e-empty">
          {activeDayType
            ? `${activeDayType}に必要なタスクがありません`
            : "タスクがありません"}
        </li>
      ) : (
        tasks.map(({ taskId, taskName, department, shifts }) => {
          const detailUrl = buildDetailUrl(taskId);
          return (
            <li
              key={taskId}
              className={`e-item ${selectedTaskId === taskId ? "is-selected" : ""}`}
              onDragStart={() => { draggingTaskId = taskId; }}
              onDragEnd={() => { draggingTaskId = null; }}
            >
              {/* タスクヘッダー（クリックで詳細へ） */}
              <ObjectView
                type="Task"
                url={detailUrl}
                label={taskName}
                draggable={true}
                onClick={() => onTaskClick?.(taskId)}
              >
                <div className="e-task-header">
                  <AssignmentIcon fontSize="small" className="e-icon" />
                  <div className="e-task-name">{taskName}</div>
                  <span className="e-dept-badge">{department}</span>
                </div>
              </ObjectView>

              {/* シフト一覧（インライン表示） */}
              <div className="e-shifts">
                {shifts.map((shift) => (
                  <div key={shift.id} className="e-shift-chip">
                    <span className="e-day">{DAY_SHORT[shift.dayType] ?? shift.dayType}</span>
                    <span className="e-time">{shift.startTime}–{shift.endTime}</span>
                    <span className="e-count">{shift.requiredCount}名</span>
                  </div>
                ))}
              </div>
            </li>
          );
        })
      )}
    </StyledTaskList>
  );
};

const StyledTaskList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;

  > .e-empty {
    padding: 16px;
    text-align: center;
    color: #666;
  }

  > .e-item {
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    &.is-selected > :first-child {
      background-color: #fff3e0;
    }

    .e-task-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.12s;

      &:hover {
        background-color: #f5f5f5;
      }
    }

    .e-icon {
      color: #e65100;
      flex-shrink: 0;
    }

    .e-task-name {
      flex: 1;
      font-weight: bold;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-dept-badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 0.78em;
      font-weight: bold;
      background-color: #fff3e0;
      color: #e65100;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .e-shifts {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      padding: 0 12px 6px 32px;
    }

    .e-shift-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 0.75em;
      white-space: nowrap;
    }

    .e-day {
      color: #e65100;
      font-weight: bold;
    }

    .e-time {
      color: #555;
    }

    .e-count {
      color: #1976d2;
      font-weight: bold;
    }
  }
`;
