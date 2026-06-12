/**
 * Bublys Bubly Entry Point for hotel-shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { hotelShiftPuzzleBubbleRoutes } from "./registration/index.js";

const HotelShiftPuzzleBubly: Bubly = {
  name: "hotel-shift-puzzle",
  version: "0.0.1",
  label: "Hotel Shift Puzzle",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  initialBubbleUrls: [],
  backdropColor: "hsl(20, 40%, 22%)",

  menuItems: [],

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
