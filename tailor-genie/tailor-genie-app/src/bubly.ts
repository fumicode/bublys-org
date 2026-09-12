/**
 * Bublys Bubly Entry Point for tailor-genie
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import ChatIcon from "@mui/icons-material/Chat";

// Bubble Routes
import { tailorGenieBubbleRoutes } from "@bublys-org/tailor-genie-libs";

const TailorGenieBubly: Bubly = {
  name: "tailor-genie",
  version: "0.0.1",
  label: "Tailor Genie",
  icon: React.createElement(ChatIcon, { color: "primary" }),
  initialBubbleUrls: ["tailor-genie/conversations", "tailor-genie/speakers"],
  backdropColor: "hsl(35, 50%, 22%)",

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
