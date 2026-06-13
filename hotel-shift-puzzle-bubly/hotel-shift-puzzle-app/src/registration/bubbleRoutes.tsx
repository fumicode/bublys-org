"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  StaffCollection,
  StaffDetail,
  WorkShiftCollection,
  ScheduleCollection,
  ScheduleGrid,
  HotelObjectsProvider,
  ScheduleWorldLineView,
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

// --- 月間スタッフ勤務表バブル（グリッド + 世界線ビューへのリンク） ---
const ScheduleBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const scheduleId = bubble.params.scheduleId;
  return (
    <HotelObjectsProvider>
      <ScheduleGrid
        scheduleId={scheduleId}
        onOpenHistory={() =>
          openBubble(
            `hotel-shift-puzzle/schedules/${scheduleId}/history`,
            bubble.id,
            "bubble-side"
          )
        }
      />
    </HotelObjectsProvider>
  );
};

// --- 勤務表の世界線ビューバブル（canvas版） ---
const ScheduleWorldLineBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <HotelObjectsProvider>
      <ScheduleWorldLineView scheduleId={bubble.params.scheduleId} />
    </HotelObjectsProvider>
  );
};

/** このバブリのバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/staffs/:staffId", type: "staff", Component: StaffDetailBubble },
  { pattern: "hotel-shift-puzzle/staffs", type: "staff-list", Component: StaffListBubble },
  { pattern: "hotel-shift-puzzle/work-shifts", type: "work-shift-list", Component: WorkShiftListBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/history", type: "schedule-history", Component: ScheduleWorldLineBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedules", type: "schedule-list", Component: ScheduleListBubble },
];
