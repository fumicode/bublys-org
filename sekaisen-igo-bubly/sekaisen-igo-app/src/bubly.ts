/**
 * Bublys Bubly Entry Point for sekaisen-igo
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

// Bubble Routes
import { sekaisenIgoBubbleRoutes } from "@bublys-org/sekaisen-igo-libs";

const SekaisenIgoBubly: Bubly = {
  name: "sekaisen-igo",
  version: "0.0.1",
  label: "世界線囲碁",
  icon: React.createElement(SportsEsportsIcon, { color: "primary" }),
  initialBubbleUrls: ["sekaisen-igo/games"],
  backdropColor: "hsl(155, 30%, 18%)",

  menuItems: [
    {
      label: "対局一覧",
      url: "sekaisen-igo/games",
      icon: React.createElement(SportsEsportsIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(sekaisenIgoBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(SekaisenIgoBubly);

export default SekaisenIgoBubly;
