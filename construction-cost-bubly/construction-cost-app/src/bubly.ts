/**
 * Bublys Bubly Entry Point for construction-cost
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { constructionCostBubbleRoutes } from "./registration/index.js";

const ConstructionCostBubly: Bubly = {
  name: "construction-cost",
  version: "0.0.1",
  label: "Construction Cost",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  initialBubbleUrls: [],
  backdropColor: "hsl(20, 40%, 22%)",

  // ルートを追加したらここに対応エントリーを足す
  menuItems: [],

  register(context) {
    context.registerBubbleRoutes(constructionCostBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(ConstructionCostBubly);

export default ConstructionCostBubly;
