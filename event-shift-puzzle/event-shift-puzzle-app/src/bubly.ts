/**
 * Bublys Bubly Entry Point for shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { shiftPuzzleBubbleRoutes } from "./registration/index.js";

const ShiftPuzzleBubly: Bubly = {
  name: "shift-puzzle",
  version: "0.0.1",
  label: "イベントシフトパズル",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  initialBubbleUrls: [
    "shift-puzzle/shift-plans",
    "shift-puzzle/tasks",
  ],
  backdropColor: "hsl(20, 40%, 22%)",

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
