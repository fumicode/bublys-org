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

/**
 * モジュール変数: ドラッグ中タスクの日付（'YYYY-MM-DD'）。
 * 日付付きタスクを異なる日付のシフト表に配置するのを防ぐために使う。
 * 日付情報がないタスクのドラッグ時は null。
 */
export let draggingDate: string | null = null;

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
              onDragStart={() => {
                draggingTaskId = taskId;
                // activeDayType で絞り込むことで、GroupedTask.shifts が複数日を含む場合も単一日付を確定できる
                const relevantShifts = activeDayType
                  ? shifts.filter((s) => s.dayType === activeDayType)
                  : shifts;
                const dateSet = new Set(relevantShifts.map(s => s.state.date).filter((d): d is string => !!d));
                draggingDate = dateSet.size === 1 ? (dateSet.values().next().value as string) : null;
              }}
              onDragEnd={() => {
                draggingTaskId = null;
                draggingDate = null;
              }}
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
  }
`;
