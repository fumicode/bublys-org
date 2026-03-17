/**
 * Bublys Bubly Entry Point for shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";

// Bubble Routes
import { shiftPuzzleBubbleRoutes } from "./registration/index.js";

const ShiftPuzzleBubly: Bubly = {
  name: "shift-puzzle",
  version: "0.0.1",

  menuItems: [
    {
      label: "局員一覧",
      url: "shift-puzzle/members",
      icon: React.createElement(PeopleIcon, { color: "action" }),
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
