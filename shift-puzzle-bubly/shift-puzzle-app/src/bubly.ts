/**
 * Bublys Bubly Entry Point for shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import TaskIcon from '@mui/icons-material/Task';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { shiftPuzzleBubbleRoutes } from "./registration/index.js";

const ShiftPuzzleBubly: Bubly = {
  name: "shift-puzzle",
  version: "0.0.1",

  menuItems: [
    {
      label: "タスク一覧",
      url: "shift-puzzle/tasks",
      icon: React.createElement(TaskIcon, { color: "action" }),
    },
    {
      label: "ガント配置",
      url: "shift-puzzle/shift-plans/default/gantt",
      icon: React.createElement(CalendarViewWeekIcon, { color: "action" }),
    },
    {
      label: "プリミティブガント",
      url: "shift-puzzle/shift-plans/default-primitive/primitive-gantt",
      icon: React.createElement(GridOnIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(shiftPuzzleBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(ShiftPuzzleBubly);

export default ShiftPuzzleBubly;
