/**
 * Bublys Bubly Entry Point for shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import EventNoteIcon from "@mui/icons-material/EventNote";

// Bubble Routes
import { shiftPuzzleBubbleRoutes } from "./registration/index.js";

const ShiftPuzzleBubly: Bubly = {
  name: "shift-puzzle",
  version: "0.0.1",

  menuItems: [
    {
      label: "スタッフ一覧",
      url: "shift-puzzle/staffs",
      icon: React.createElement(EventNoteIcon, { color: "action" }),
    },
    {
      label: "シフト配置表",
      url: "shift-puzzle/shift-plans",
      icon: React.createElement(EventNoteIcon, { color: "primary" }),
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
