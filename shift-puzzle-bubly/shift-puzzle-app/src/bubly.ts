/**
 * Bublys Bubly Entry Point for shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import { shiftPuzzleBubbleRoutes } from "./registration/index.js";

const ShiftPuzzleBubly: Bubly = {
  name: "shift-puzzle",
  version: "0.0.1",

  menuItems: [
    {
      label: "シフトパズル",
      url: "shift-puzzle/editor",
      icon: null,
    },
  ],

  register(context) {
    context.registerBubbleRoutes(shiftPuzzleBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

registerBubly(ShiftPuzzleBubly);

export default ShiftPuzzleBubly;
