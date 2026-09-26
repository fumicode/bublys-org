'use client';

import { FC } from "react";
import {
  useAppDispatch,
  useAppSelector,
} from "@bublys-org/state-management";
import { Task_タスク, TaskStatus_ステータス } from "../domain/Task.domain.js";
import { selectSelectedTask, selectTaskById, updateTask } from "../slice/task-slice.js";
import { selectUsers } from "@bublys-org/users-libs";
import { TaskDetailView } from "../ui/TaskDetailView.js";

type TaskDetailProps = {
  taskId?: string;
};

export const TaskDetail: FC<TaskDetailProps> = ({ taskId }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);

  // taskIdが指定されていればそれを使い、なければ選択中のタスクを使う
  const selectedTask = useAppSelector(selectSelectedTask);
  const specificTask = useAppSelector(
    taskId ? selectTaskById(taskId) : () => undefined
  );

  const task = taskId ? specificTask : selectedTask;

  /**
   * ★ **取る → 集約のメソッド → toJSON → 保存**（CLAUDE.md 規則6の流れ）。
   *
   *   前はここで plain を広げて `updatedAt: new Date()` を手で書いていた（3 か所）。
   *   時刻の付け方が集約とここで二重になるうえ、ステータスだけは
   *   **reducer の中で**書き換えていた（同じ入力で違う結果になる reducer）。
   *   集約に任せれば、どの変え方でも同じ道を通る。
   */
  const save = (next: Task_タスク) => dispatch(updateTask(next.toJSON()));

  const handleStatusChange = (status: TaskStatus_ステータス) => {
    if (!task) return;
    save(task.withStatus(status));
  };

  const handleTitleChange = (title: string) => {
    if (!task) return;
    save(task.withTitle(title));
  };

  const handleDescriptionChange = (description: string) => {
    if (!task) return;
    save(task.withDescription(description));
  };

  const handleAssigneeChange = (assigneeId: string | undefined) => {
    if (!task) return;
    save(task.withAssignee(assigneeId));
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
    />
  );
};
