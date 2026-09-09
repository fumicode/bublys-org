/**
 * Bublys Bubly Entry Point for gakkai-shift
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import EventNoteIcon from "@mui/icons-material/EventNote";

// Bubble Routes
import { gakkaiShiftBubbleRoutes } from "./registration/index.js";

const GakkaiShiftBubly: Bubly = {
  name: "gakkai-shift",
  version: "0.0.1",
  label: "学会シフトパズル",
  icon: React.createElement(EventNoteIcon, { color: "primary" }),
  initialBubbleUrls: ["gakkai-shift/staffs", "gakkai-shift/shift-plans"],
  backdropColor: "hsl(210, 35%, 22%)",

  register(context) {
    context.registerBubbleRoutes(gakkaiShiftBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(GakkaiShiftBubly);

export default GakkaiShiftBubly;
