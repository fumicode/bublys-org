/**
 * Bublys Bubly Entry Point for hotel-shift-puzzle
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly, BublyMenuItem } from "@bublys-org/bubbles-ui";
import GridOnIcon from '@mui/icons-material/GridOn';

// Bubble Routes
import { hotelShiftPuzzleBubbleRoutes, shiftWishListUrl } from "./registration/index.js";

import PeopleIcon from "@mui/icons-material/People";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RuleIcon from "@mui/icons-material/Rule";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SaveIcon from "@mui/icons-material/Save";
import BugReportIcon from "@mui/icons-material/BugReport";
import SchemaIcon from "@mui/icons-material/Schema";
import ViewInArIcon from "@mui/icons-material/ViewInAr";

/**
 * **このバブリで開けるもの。** 名乗るのはここ 1 か所。
 *
 * 単体で開いたときは脇の帯（`BublyApp`）に、OS にロードしたときは**その窓の岸**に
 * 貼った呼び出しとして出る ── 前は単体の画面にしか書いていなかったので、
 * OS の中では種しか出てこず、ほかの一覧へ辿り着けなかった。
 */
export const menuItems: BublyMenuItem[] = [
  { label: "スタッフ一覧", url: 'hotel-shift-puzzle/staffs', icon: React.createElement(PeopleIcon) },
  { label: "勤務帯", url: 'hotel-shift-puzzle/work-shifts', icon: React.createElement(ScheduleIcon) },
  { label: "制約", url: 'hotel-shift-puzzle/constraints', icon: React.createElement(RuleIcon) },
  { label: "シフト希望", url: shiftWishListUrl(), icon: React.createElement(EditCalendarIcon) },
  { label: "勤務表", url: 'hotel-shift-puzzle/schedules', icon: React.createElement(CalendarMonthIcon) },
  { label: "ファイル", url: 'hotel-shift-puzzle/file', icon: React.createElement(SaveIcon) },
  { label: "世界線インスペクタ", url: 'hotel-shift-puzzle/world-line-inspector', icon: React.createElement(BugReportIcon) },
  { label: "クラス図", url: 'hotel-shift-puzzle/model-class-diagram', icon: React.createElement(SchemaIcon) },
  { label: "世界線 3D", url: 'hotel-shift-puzzle/world-line-3d', icon: React.createElement(ViewInArIcon) },
];

const HotelShiftPuzzleBubly: Bubly = {
  name: "hotel-shift-puzzle",
  version: "0.0.1",
  label: "シフトントン",
  icon: React.createElement(GridOnIcon, { color: "primary" }),
  menuItems,
  initialBubbleUrls: ["hotel-shift-puzzle/schedules"],
  backdropColor: "hsl(20, 40%, 22%)",

  register(context) {
    context.registerBubbleRoutes(hotelShiftPuzzleBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(HotelShiftPuzzleBubly);

export default HotelShiftPuzzleBubly;
