/**
 * Bublys Bubly Entry Point for ekikyo
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly, BublyMenuItem } from "@bublys-org/bubbles-ui";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

// Bubble Routes
import { ekikyoBubbleRoutes } from "./registration/index.js";


/**
 * **このバブリで開けるもの。** 名乗るのはここ 1 か所。
 *
 * 単体で開いたときは脇の帯（`BublyApp`）に、OS にロードしたときは**その窓の岸**に
 * 貼った呼び出しとして出る ── 前は単体の画面にしか書いていなかったので、
 * OS の中では種しか出てこず、ほかの一覧へ辿り着けなかった。
 */
export const menuItems: BublyMenuItem[] = [
  { label: "九星盤（五黄中心）", url: "ekikyo/kyuseis/五黄", icon: React.createElement(AutoAwesomeIcon) },
  { label: "九星盤（一白中心）", url: "ekikyo/kyuseis/一白", icon: React.createElement(AutoAwesomeIcon) },
  { label: "九星盤（九紫中心）", url: "ekikyo/kyuseis/九紫", icon: React.createElement(AutoAwesomeIcon) },
];

const EkikyoBubly: Bubly = {
  name: "ekikyo",
  version: "0.0.1",
  label: "易経 - 九星盤",
  icon: React.createElement(AutoAwesomeIcon, { color: "primary" }),
  menuItems,
  initialBubbleUrls: ["ekikyo/kyuseis/五黄"],
  backdropColor: "hsl(355, 50%, 22%)",

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
