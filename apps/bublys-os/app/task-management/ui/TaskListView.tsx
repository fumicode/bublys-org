'use client';

import { FC } from "react";
import styled from "styled-components";
import { Task_タスク, TaskStatus_ステータス } from "@bublys-org/state-management";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { UrledPlace } from "../../bubble-ui/components";

type TaskListViewProps = {
  taskList: Task_タスク[];
  selectedTaskId?: string | null;
  buildDetailUrl: (taskId: string) => string;
  onTaskClick?: (taskId: string) => void;
};

export const TaskListView: FC<TaskListViewProps> = ({
  taskList,
  selectedTaskId,
  buildDetailUrl,
  onTaskClick,
}) => {
  return (
    <StyledTaskList>
      {taskList.length === 0 ? (
        <li className="e-empty">タスクがありません</li>
      ) : (
        taskList.map((task) => {
          const detailUrl = buildDetailUrl(task.id);
          return (
            <li
              key={task.id}
              className={`e-item ${selectedTaskId === task.id ? "is-selected" : ""}`}
            >
              <UrledPlace url={detailUrl}>
                <button
                  style={{ all: "unset", cursor: "pointer", width: "100%" }}
                  onClick={() => onTaskClick?.(task.id)}
                >
                  <div className="e-content">
                    <AssignmentIcon fontSize="small" className="e-icon" />
                    <div className="e-text">
                      <div className="e-title">{task.title}</div>
                      {task.description && (
                        <div className="e-description">{task.description}</div>
                      )}
                    </div>
                    <div className="e-status">
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                </button>
              </UrledPlace>
            </li>
          );
        })
      )}
    </StyledTaskList>
  );
};

const StatusBadge: FC<{ status: TaskStatus_ステータス }> = ({ status }) => {
  const label = Task_タスク.getStatusLabel(status);
  return <span className={`e-badge e-badge--${status}`}>{label}</span>;
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
      background-color: #e3f2fd;
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
      color: #666;
    }

    .e-text {
      flex: 1;
      min-width: 0;
    }

    .e-title {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-description {
      color: #666;
      font-size: 0.85em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-status {
      flex-shrink: 0;
    }

    .e-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: bold;

      &.e-badge--todo {
        background-color: #f5f5f5;
        color: #666;
      }

      &.e-badge--doing {
        background-color: #e3f2fd;
        color: #1976d2;
      }

      &.e-badge--done {
        background-color: #e8f5e9;
        color: #2e7d32;
      }
    }
  }
`;
