"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { TaskCollection } from "./feature/TaskCollection";
import { TaskDetail } from "./feature/TaskDetail";

// タスク管理 - タスク一覧バブル
const TaskCollectionBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleTaskSelect = (taskId: string) => {
    openBubble(`task-management/tasks/${taskId}`, bubble.id, "bubble-side");
  };
  return <TaskCollection onTaskSelect={handleTaskSelect} />;
};

// タスク管理 - タスク詳細バブル
const TaskDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const taskId = bubble.url.replace("task-management/tasks/", "");

  const handleUserClick = (userId: string) => {
    openBubble(`users/${userId}`, bubble.id, "bubble-side");
  };

  return <TaskDetail taskId={taskId} onUserClick={handleUserClick} />;
};

/** タスク管理機能のバブルルート定義 */
export const taskManagementBubbleRoutes: BubbleRoute[] = [
  { pattern: /^task-management\/tasks$/, type: "task-management-tasks", Component: TaskCollectionBubble },
  { pattern: /^task-management\/tasks\/[^/]+$/, type: "task-management-task", Component: TaskDetailBubble },
];
