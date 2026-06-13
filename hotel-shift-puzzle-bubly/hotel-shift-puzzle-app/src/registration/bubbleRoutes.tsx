"use client";

import { useContext, type ReactNode } from "react";
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

// 全バブルは統一リポジトリ（アプリ全体の世界線スコープ）にアクセスするため、
// HotelObjectsProvider（CASレジストリ）配下に置く。
const withObjects = (node: ReactNode) => (
  <HotelObjectsProvider>{node}</HotelObjectsProvider>
);

// --- スタッフ一覧バブル ---
const StaffListBubble: BubbleRoute["Component"] = () => withObjects(<StaffCollection />);

// --- スタッフ詳細バブル ---
const StaffDetailBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<StaffDetail staffId={bubble.params.staffId} />);

// --- 勤務帯リストバブル（リスト内で追加・編集） ---
const WorkShiftListBubble: BubbleRoute["Component"] = () => withObjects(<WorkShiftCollection />);

// --- 勤務表一覧バブル（複数の勤務表を作成・管理） ---
const ScheduleListBubble: BubbleRoute["Component"] = () => withObjects(<ScheduleCollection />);

// --- 月間スタッフ勤務表バブル（グリッド + 世界線ビューへのリンク） ---
const ScheduleBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const scheduleId = bubble.params.scheduleId;
  return withObjects(
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
  );
};

// --- 勤務表の世界線ビューバブル（canvas版） ---
const ScheduleWorldLineBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<ScheduleWorldLineView scheduleId={bubble.params.scheduleId} />);

/** このバブリのバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/staffs/:staffId", type: "staff", Component: StaffDetailBubble },
  { pattern: "hotel-shift-puzzle/staffs", type: "staff-list", Component: StaffListBubble },
  { pattern: "hotel-shift-puzzle/work-shifts", type: "work-shift-list", Component: WorkShiftListBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/history", type: "schedule-history", Component: ScheduleWorldLineBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedules", type: "schedule-list", Component: ScheduleListBubble },
];
