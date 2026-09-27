/**
 * Bublys Bubly Entry Point for shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly, BublyMenuItem } from "@bublys-org/bubbles-ui";
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { shiftPuzzleBubbleRoutes } from "./registration/index.js";

import PeopleIcon from "@mui/icons-material/People";
import TaskIcon from "@mui/icons-material/Task";

/**
 * **このバブリで開けるもの。** 名乗るのはここ 1 か所。
 *
 * 単体で開いたときは脇の帯（`BublyApp`）に、OS にロードしたときは**その窓の岸**に
 * 貼った呼び出しとして出る ── 前は単体の画面にしか書いていなかったので、
 * OS の中では種しか出てこず、ほかの一覧へ辿り着けなかった。
 */
export const menuItems: BublyMenuItem[] = [
  { label: "局員一覧", url: "shift-puzzle/members", icon: React.createElement(PeopleIcon) },
  { label: "タスク一覧", url: "shift-puzzle/tasks", icon: React.createElement(TaskIcon) },
  { label: "シフト表リスト", url: "shift-puzzle/shift-plans", icon: React.createElement(GridOnIcon) },
];

const ShiftPuzzleBubly: Bubly = {
  name: "shift-puzzle",
  version: "0.0.1",
  label: "イベントシフトパズル",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  menuItems,
  /**
   * 世界線に使う名前の頭 ── シフト案 1 つにつき 1 本（`shift-plan:<案id>`）。
   * 自分の名前と同じ世界線は名乗らなくても自分のものとして数えられる。
   */
  worldLineScopePrefixes: ["shift-plan:"],

  initialBubbleUrls: [
    "shift-puzzle/shift-plans",
    "shift-puzzle/tasks",
  ],
  backdropColor: "hsl(20, 40%, 22%)",

  register(context) {
    context.registerBubbleRoutes(shiftPuzzleBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(ShiftPuzzleBubly);

export default ShiftPuzzleBubly;
