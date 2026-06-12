/**
 * Bublys Bubly Entry Point for ekikyo
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

// Bubble Routes
import { ekikyoBubbleRoutes } from "./registration/index.js";

const EkikyoBubly: Bubly = {
  name: "ekikyo",
  version: "0.0.1",
  label: "易経 - 九星盤",
  icon: React.createElement(AutoAwesomeIcon, { color: "primary" }),
  initialBubbleUrls: ["ekikyo/kyuseis/五黄"],
  backdropColor: "hsl(355, 50%, 22%)",

  menuItems: [
    {
      label: "九星盤",
      url: "ekikyo/kyuseis/五黄",
      icon: React.createElement(AutoAwesomeIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(ekikyoBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(EkikyoBubly);

export default EkikyoBubly;
