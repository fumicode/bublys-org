"use client";

import { useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { ListSpace } from "@bublys-org/bubble-layout-feature";
import { Button } from "@mui/material";
import {
  useAppDispatch,
  useAppSelector,
  selectTaskList,
  addTask,
  TaskJSON,
} from "@bublys-org/state-management";
import { TaskCard } from "./ui/TaskCard";
import { TaskDetail } from "./feature/TaskDetail";
import { useSeedTasks } from "./feature/useSeedTasks";

/** 札 1 枚の大きさ（一覧が「縦に収まるか」を測るのに使う） */
const CARD = { w: 280, h: 64 };

/**
 * タスク一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。タスク 1 件を泡にして、
 * 「少ないときは縦に並べる／多いときは奥行きに重ねる」を親の View に任せる。
 */
const TaskCollectionBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);
  useSeedTasks();
  const taskList = useAppSelector(selectTaskList);
  const members = useMemo(
    () => taskList.map((t) => `task-management/tasks/${t.id}/card`),
    [taskList],
  );
  /**
   * 「新しく作る」は並びの外（泡にはならない口）。**作ったらそのまま開く**
   * ── 題名は詳細で書き換えられるので、ここで打たせる欄は要らない。
   */
  const newTask = useCallback(() => {
    const now = new Date().toISOString();
    const task: TaskJSON = {
      id: crypto.randomUUID(),
      title: "新しいタスク",
      description: "",
      status: "todo",
      createdAt: now,
      updatedAt: now,
    };
    dispatch(addTask(task));
    openBubble(`task-management/tasks/${task.id}`, bubble.id);
  }, [dispatch, openBubble, bubble.id]);

  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      head={
        <Button
          size="small"
          variant="contained"
          onClick={newTask}
          sx={{ minWidth: 0, px: 0.9, py: 0.2, fontSize: 11, lineHeight: 1.5 }}
        >
          ＋新規
        </Button>
      }
    />
  );
};

/** タスク 1 件の札 ── 一覧の中の泡 */
const TaskCardBubble: BubbleRoute["Component"] = ({ bubble }) => (
  <TaskCard taskId={bubble.url.replace("task-management/tasks/", "").replace("/card", "")} />
);

// タスク管理 - タスク詳細バブル
const TaskDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const taskId = bubble.url.replace("task-management/tasks/", "");

  return <TaskDetail taskId={taskId} />;
};

/** タスク管理機能のバブルルート定義 */
export const taskManagementBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^task-management\/tasks$/,
    type: "task-management-tasks",
    Component: TaskCollectionBubble,
    // 一覧は地を敷かない ── 並びの空間は海がそのまま透ける。箱は札 280 に対して広く取る
    bubbleOptions: { defaultSize: { width: 420, height: 520 }, contentBackground: "transparent" },
  },
  // ★ 札は詳細より**先に**置く（`tasks/:id` が `.../card` も飲み込むので）
  {
    pattern: /^task-management\/tasks\/[^/]+\/card$/,
    type: "task-management-task-card",
    Component: TaskCardBubble,
    bubbleOptions: { defaultSize: { width: CARD.w, height: CARD.h } },
  },
  {
    pattern: /^task-management\/tasks\/[^/]+$/,
    type: "task-management-task",
    Component: TaskDetailBubble,
    // ★ **全部映ることが意味の画面**。既定の 320×240 だと巻物になる（実測：中身 446px）
    bubbleOptions: { defaultSize: { width: 420, height: 520 } },
  },
];
