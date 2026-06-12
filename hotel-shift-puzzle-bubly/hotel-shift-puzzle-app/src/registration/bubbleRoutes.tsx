"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import {
  StaffCollection,
  StaffDetail,
  WorkShiftCollection,
  ScheduleCollection,
  ScheduleGrid,
} from "@bublys-org/hotel-shift-puzzle-libs";

// --- スタッフ一覧バブル ---
const StaffListBubble: BubbleRoute["Component"] = () => {
  return <StaffCollection />;
};

// --- スタッフ詳細バブル ---
const StaffDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <StaffDetail staffId={bubble.params.staffId} />;
};

// --- 勤務帯リストバブル（リスト内で追加・編集） ---
const WorkShiftListBubble: BubbleRoute["Component"] = () => {
  return <WorkShiftCollection />;
};

// --- 勤務表一覧バブル（複数の勤務表を作成・管理） ---
const ScheduleListBubble: BubbleRoute["Component"] = () => {
  return <ScheduleCollection />;
};

// --- 月間スタッフ勤務表バブル（グリッド） ---
const ScheduleBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <ScheduleGrid scheduleId={bubble.params.scheduleId} />;
};

/** このバブリのバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/staffs/:staffId", type: "staff", Component: StaffDetailBubble },
  { pattern: "hotel-shift-puzzle/staffs", type: "staff-list", Component: StaffListBubble },
  { pattern: "hotel-shift-puzzle/work-shifts", type: "work-shift-list", Component: WorkShiftListBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedules", type: "schedule-list", Component: ScheduleListBubble },
];
