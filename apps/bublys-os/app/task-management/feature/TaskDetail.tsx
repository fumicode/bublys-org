'use client';

import { FC } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectSelectedTask,
  selectTaskById,
  updateTaskStatus,
  updateTask,
  TaskStatus_ステータス,
} from "@bublys-org/state-management";
import { selectUsers } from "@bublys-org/users-libs";
import { TaskDetailView } from "../ui/TaskDetailView";

type TaskDetailProps = {
  taskId?: string;
  onUserClick?: (userId: string) => void;
};

export const TaskDetail: FC<TaskDetailProps> = ({ taskId, onUserClick }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);

  // taskIdが指定されていればそれを使い、なければ選択中のタスクを使う
  const selectedTask = useAppSelector(selectSelectedTask);
  const specificTask = useAppSelector(
    taskId ? selectTaskById(taskId) : () => undefined
  );

  const task = taskId ? specificTask : selectedTask;

  const handleStatusChange = (status: TaskStatus_ステータス) => {
    if (!task) return;
    dispatch(updateTaskStatus({ id: task.id, status }));
  };

  const handleTitleChange = (title: string) => {
    if (!task) return;
    dispatch(updateTask({
      ...task.toJSON(),
      title,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDescriptionChange = (description: string) => {
    if (!task) return;
    dispatch(updateTask({
      ...task.toJSON(),
      description,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAssigneeChange = (assigneeId: string | undefined) => {
    if (!task) return;
    dispatch(updateTask({
      ...task.toJSON(),
      assigneeId,
      updatedAt: new Date().toISOString(),
    }));
  };

  const buildUserDetailUrl = (userId: string) => `users/${userId}`;

  if (!task) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        タスクを選択してください
      </div>
    );
  }

  return (
    <TaskDetailView
      task={task}
      users={users}
      onStatusChange={handleStatusChange}
      onTitleChange={handleTitleChange}
      onDescriptionChange={handleDescriptionChange}
      onAssigneeChange={handleAssigneeChange}
      buildUserDetailUrl={buildUserDetailUrl}
      onUserClick={onUserClick}
    />
  );
};
