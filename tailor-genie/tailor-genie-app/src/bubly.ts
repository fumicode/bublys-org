/**
 * Bublys Bubly Entry Point for tailor-genie
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly, BublyMenuItem } from "@bublys-org/bubbles-ui";
import ChatIcon from "@mui/icons-material/Chat";

// Bubble Routes
import { tailorGenieBubbleRoutes } from "@bublys-org/tailor-genie-libs";

import PersonIcon from "@mui/icons-material/Person";

/**
 * **このバブリで開けるもの。** 名乗るのはここ 1 か所。
 *
 * 単体で開いたときは脇の帯（`BublyApp`）に、OS にロードしたときは**その窓の岸**に
 * 貼った呼び出しとして出る ── 前は単体の画面にしか書いていなかったので、
 * OS の中では種しか出てこず、ほかの一覧へ辿り着けなかった。
 */
export const menuItems: BublyMenuItem[] = [
  { label: "会話一覧", url: "tailor-genie/conversations", icon: React.createElement(ChatIcon) },
  { label: "スピーカー一覧", url: "tailor-genie/speakers", icon: React.createElement(PersonIcon) },
];

const TailorGenieBubly: Bubly = {
  name: "tailor-genie",
  version: "0.0.1",
  label: "Tailor Genie",
  icon: React.createElement(ChatIcon, { color: "primary" }),
  menuItems,
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
