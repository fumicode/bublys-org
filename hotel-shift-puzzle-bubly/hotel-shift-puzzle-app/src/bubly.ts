/**
 * Bublys Bubly Entry Point for hotel-shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import TaskIcon from '@mui/icons-material/Task';
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { hotelShiftPuzzleBubbleRoutes } from "./registration/index.js";

const HotelShiftPuzzleBubly: Bubly = {
  name: "hotel-shift-puzzle",
  version: "0.0.1",
  label: "シフトパズル",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  initialBubbleUrls: [
    "hotel-shift-puzzle/shift-plans",
    "hotel-shift-puzzle/tasks",
  ],
  backdropColor: "hsl(20, 40%, 22%)",

  menuItems: [
    {
      label: "タスク一覧",
      url: "hotel-shift-puzzle/tasks",
      icon: React.createElement(TaskIcon, { color: "action" }),
    },
    {
      label: "プリミティブガント",
      url: "hotel-shift-puzzle/shift-plans/default-primitive/primitive-gantt",
      icon: React.createElement(GridOnIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(hotelShiftPuzzleBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(HotelShiftPuzzleBubly);

export default HotelShiftPuzzleBubly;
