/**
 * **このバブリの定義** ── 名前・見せ方・**大元の url から何を開くか**を書く 1 か所。
 *
 * ここはスタンドアロンの束（`vite.config.bubly.ts`）の入口でもある。OS からは
 * `{origin}/bubly.js` として読み込まれ、`registerBubly` で登録される。
 *
 * ★ `initialBubbleUrls` が「`task-bubly` を開いたら何が開くか」。
 *   OS のランチャーはこの大元の url だけを持ち、実際に開く泡はここから引く
 *   ── 呼び出す側に `task-management/tasks` と書かせない。
 */
import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import AssignmentIcon from "@mui/icons-material/Assignment";

import { taskManagementBubbleRoutes } from "@bublys-org/task-libs";

const TaskBubly: Bubly = {
  name: "task",
  version: "0.0.1",
  label: "タスク管理",
  icon: React.createElement(AssignmentIcon, { color: "primary" }),
  initialBubbleUrls: ["task-management/tasks"],
  backdropColor: "hsl(140, 45%, 22%)",

  register(context) {
    context.registerBubbleRoutes(taskManagementBubbleRoutes);
  },
};

registerBubly(TaskBubly);

export default TaskBubly;
