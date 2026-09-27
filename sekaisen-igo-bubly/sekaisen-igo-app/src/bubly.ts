/**
 * Bublys Bubly Entry Point for sekaisen-igo
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly, BublyMenuItem } from "@bublys-org/bubbles-ui";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

// Bubble Routes
import { sekaisenIgoBubbleRoutes } from "@bublys-org/sekaisen-igo-libs";


/**
 * **このバブリで開けるもの。** 名乗るのはここ 1 か所。
 *
 * 単体で開いたときは脇の帯（`BublyApp`）に、OS にロードしたときは**その窓の岸**に
 * 貼った呼び出しとして出る ── 前は単体の画面にしか書いていなかったので、
 * OS の中では種しか出てこず、ほかの一覧へ辿り着けなかった。
 */
export const menuItems: BublyMenuItem[] = [
  { label: "対局一覧", url: "sekaisen-igo/games", icon: React.createElement(SportsEsportsIcon) },
];

const SekaisenIgoBubly: Bubly = {
  name: "sekaisen-igo",
  version: "0.0.1",
  label: "世界線囲碁",
  icon: React.createElement(SportsEsportsIcon, { color: "primary" }),
  menuItems,
  initialBubbleUrls: ["sekaisen-igo/games"],
  backdropColor: "hsl(155, 30%, 18%)",

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
