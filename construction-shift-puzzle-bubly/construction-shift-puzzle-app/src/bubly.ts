/**
 * Bublys Bubly Entry Point for construction-shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import GridOnIcon from '@mui/icons-material/GridOn';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// Bubble Routes
import { constructionShiftPuzzleBubbleRoutes } from "./registration/index.js";

const ConstructionShiftPuzzleBubly: Bubly = {
  name: "construction-shift-puzzle",
  version: "0.0.1",
  label: "Construction Shift Puzzle",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  initialBubbleUrls: ["construction-shift-puzzle/board"],
  backdropColor: "hsl(20, 40%, 22%)",

  menuItems: [
    {
      label: "配置表",
      url: "construction-shift-puzzle/board",
      icon: React.createElement(GridOnIcon, { color: "action" }),
    },
    {
      label: "現場",
      url: "construction-shift-puzzle/sites",
      icon: React.createElement(LocationOnIcon, { color: "action" }),
    },
    {
      label: "社員",
      url: "construction-shift-puzzle/employees",
      icon: React.createElement(PersonIcon, { color: "action" }),
    },
    {
      label: "機械",
      url: "construction-shift-puzzle/machines",
      icon: React.createElement(LocalShippingIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(constructionShiftPuzzleBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(ConstructionShiftPuzzleBubly);

export default ConstructionShiftPuzzleBubly;
