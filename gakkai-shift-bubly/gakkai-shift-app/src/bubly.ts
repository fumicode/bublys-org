/**
 * Bublys Bubly Entry Point for gakkai-shift
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly, BublyMenuItem } from "@bublys-org/bubbles-ui";
import EventNoteIcon from "@mui/icons-material/EventNote";

// Bubble Routes
import { gakkaiShiftBubbleRoutes } from "./registration/index.js";

import PeopleIcon from "@mui/icons-material/People";

/**
 * **このバブリで開けるもの。** 名乗るのはここ 1 か所。
 *
 * 単体で開いたときは脇の帯（`BublyApp`）に、OS にロードしたときは**その窓の岸**に
 * 貼った呼び出しとして出る ── 前は単体の画面にしか書いていなかったので、
 * OS の中では種しか出てこず、ほかの一覧へ辿り着けなかった。
 */
export const menuItems: BublyMenuItem[] = [
  { label: "スタッフ一覧", url: "gakkai-shift/staffs", icon: React.createElement(PeopleIcon) },
  { label: "シフト配置表", url: "gakkai-shift/shift-plans", icon: React.createElement(EventNoteIcon) },
];

const GakkaiShiftBubly: Bubly = {
  name: "gakkai-shift",
  version: "0.0.1",
  label: "学会シフトパズル",
  icon: React.createElement(EventNoteIcon, { color: "primary" }),
  menuItems,
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
