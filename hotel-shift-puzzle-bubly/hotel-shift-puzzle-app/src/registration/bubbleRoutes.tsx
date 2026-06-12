"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { StaffCollection, StaffDetail, ScheduleGrid } from "@bublys-org/hotel-shift-puzzle-libs";

// --- スタッフ一覧バブル ---
const StaffListBubble: BubbleRoute["Component"] = () => {
  return <StaffCollection />;
};

// --- スタッフ詳細バブル ---
const StaffDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <StaffDetail staffId={bubble.params.staffId} />;
};

// --- 月間スタッフ勤務表バブル ---
const ScheduleBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <ScheduleGrid scheduleId={bubble.params.scheduleId} />;
};

/** このバブリのバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/staffs/:staffId", type: "staff", Component: StaffDetailBubble },
  { pattern: "hotel-shift-puzzle/staffs", type: "staff-list", Component: StaffListBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedule", type: "schedule", Component: ScheduleBubble },
];
