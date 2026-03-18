'use client';

import { FC } from "react";
import styled from "styled-components";
import { Task } from "../domain/index.js";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { ObjectView } from "@bublys-org/bubbles-ui";

type TaskListViewProps = {
  taskList: Task[];
  selectedTaskId?: string | null;
  buildDetailUrl: (taskId: string) => string;
  onTaskClick?: (taskId: string) => void;
  /** アクティブな日程ラベル（フィルター時に表示） */
  activeDayType?: string;
};

export const TaskListView: FC<TaskListViewProps> = ({
  taskList,
  selectedTaskId,
  buildDetailUrl,
  onTaskClick,
  activeDayType,
}) => {
  return (
    <StyledTaskList>
      {taskList.length === 0 ? (
        <li className="e-empty">
          {activeDayType
            ? `${activeDayType}に必要なタスクがありません`
            : "タスクがありません"}
        </li>
      ) : (
        taskList.map((task) => {
          const detailUrl = buildDetailUrl(task.id);
          return (
            <li
              key={task.id}
              className={`e-item ${selectedTaskId === task.id ? "is-selected" : ""}`}
            >
              <ObjectView
                type="Task"
                url={detailUrl}
                label={task.name}
                draggable={true}
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="e-content">
                  <AssignmentIcon fontSize="small" className="e-icon" />
                  <div className="e-text">
                    <div className="e-name">{task.name}</div>
                    <div className="e-meta">
                      <span className="e-dept-badge">
                        {task.responsibleDepartment}
                      </span>
                      <span className="e-task">{task.task}</span>
                    </div>
                  </div>
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
  max-height: 400px;
  overflow-y: auto;

  > .e-empty {
    padding: 16px;
    text-align: center;
    color: #666;
  }

  > .e-item {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }

    &.is-selected {
      background-color: #fff3e0;
    }

    &:last-child {
      border-bottom: none;
    }

    > .e-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .e-icon {
      color: #e65100;
      flex-shrink: 0;
    }

    .e-text {
      flex: 1;
      min-width: 0;
    }

    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-meta {
      color: #666;
      font-size: 0.85em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .e-dept-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.8em;
      font-weight: bold;
      background-color: #fff3e0;
      color: #e65100;
      flex-shrink: 0;
    }

    .e-task {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
