"use client";

import { useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { Button } from "@mui/material";
import {
  useAppDispatch,
  useAppSelector,
} from "@bublys-org/state-management";
import { TaskJSON } from "../domain/Task.domain.js";
import { selectTaskList, addTask } from "../slice/task-slice.js";
import { TaskCard } from "../ui/TaskCard.js";
import { TaskDetail } from "../feature/TaskDetail.js";
import { useSeedTasks } from "../feature/useSeedTasks.js";

/**
 * 札 1 枚の大きさ。
 *
 * ★ **中身の数**（`chrome.ts`）。枠が取るぶんは枠が外へ足す。
 *   高さは実測（中身は 46〜54px 要る）の上限 54 ── 一覧は「全部映る」ことが意味の画面なので、
 *   1 枚ずつ巻物になるのは本末転倒。前は枠のぶん 34 を足した 88 を名乗っていた。
 */
const CARD = { w: LIST_CARD_WIDTH, h: 54 };

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
          sx={{ minWidth: 0, px: 1.35, py: 0.3, fontSize: 16.5, lineHeight: 1.5 }}
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
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" },
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
    //   中身の数（chrome.ts）── 前は枠込みの 420×520
    bubbleOptions: { defaultSize: { width: 406, height: 486 } },
  },
];
