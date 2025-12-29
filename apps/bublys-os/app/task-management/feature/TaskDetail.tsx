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
import { TaskDetailView } from "../ui/TaskDetailView";

type TaskDetailProps = {
  taskId?: string;
};

export const TaskDetail: FC<TaskDetailProps> = ({ taskId }) => {
  const dispatch = useAppDispatch();

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
      onStatusChange={handleStatusChange}
      onTitleChange={handleTitleChange}
      onDescriptionChange={handleDescriptionChange}
    />
  );
};
