"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { TaskCollection } from "./feature/TaskCollection";
import { TaskDetail } from "./feature/TaskDetail";

// タスク管理 - タスク一覧バブル
const TaskCollectionBubble: BubbleRoute["Component"] = () => {
  return <TaskCollection />;
};

// タスク管理 - タスク詳細バブル
const TaskDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const taskId = bubble.url.replace("task-management/tasks/", "");

  return <TaskDetail taskId={taskId} />;
};

/** タスク管理機能のバブルルート定義 */
export const taskManagementBubbleRoutes: BubbleRoute[] = [
  { pattern: /^task-management\/tasks$/, type: "task-management-tasks", Component: TaskCollectionBubble },
  { pattern: /^task-management\/tasks\/[^/]+$/, type: "task-management-task", Component: TaskDetailBubble },
];
