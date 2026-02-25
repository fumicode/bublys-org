/**
 * Bublys Bubly Entry Point for tailor-genie
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";

// Bubble Routes
import { tailorGenieBubbleRoutes } from "@bublys-org/tailor-genie-libs";

const TailorGenieBubly: Bubly = {
  name: "tailor-genie",
  version: "0.0.1",

  menuItems: [
    {
      label: "会話一覧",
      url: "tailor-genie/conversations",
      icon: React.createElement(ChatIcon, { color: "action" }),
    },
    {
      label: "スピーカー一覧",
      url: "tailor-genie/speakers",
      icon: React.createElement(PersonIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(tailorGenieBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(TailorGenieBubly);

export default TailorGenieBubly;
