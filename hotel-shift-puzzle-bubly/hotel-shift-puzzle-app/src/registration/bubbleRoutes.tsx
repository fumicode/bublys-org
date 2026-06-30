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
  AvailabilityEditor,
  ScheduleViolationView,
  ShiftWishEditor,
} from "@bublys-org/hotel-shift-puzzle-libs";

// 全バブルは統一リポジトリ（アプリ全体の世界線スコープ）にアクセスするため、
// HotelObjectsProvider（CASレジストリ）配下に置く。
const withObjects = (node: ReactNode) => (
  <HotelObjectsProvider>{node}</HotelObjectsProvider>
);

// --- スタッフ一覧バブル ---
const StaffListBubble: BubbleRoute["Component"] = () => withObjects(<StaffCollection />);

// --- スタッフ詳細バブル ---
const StaffDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const staffId = bubble.params.staffId;
  return withObjects(
    <StaffDetail
      staffId={staffId}
      onOpenWish={(year, month) =>
        openBubble(
          `hotel-shift-puzzle/staffs/${staffId}/shift-wish/${year}/${month}`,
          bubble.id,
          "right-side"
        )
      }
    />
  );
};

// --- スタッフ月別シフト希望エディタバブル ---
const ShiftWishBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(
    <ShiftWishEditor
      staffId={bubble.params.staffId}
      year={Number(bubble.params.year)}
      month={Number(bubble.params.month)}
    />
  );

// --- 勤務帯リストバブル（リスト内で追加・編集） ---
const WorkShiftListBubble: BubbleRoute["Component"] = () => withObjects(<WorkShiftCollection />);

// --- 勤務表一覧バブル（複数の勤務表を作成・管理） ---
const ScheduleListBubble: BubbleRoute["Component"] = () => withObjects(<ScheduleCollection />);

// --- 月間スタッフ勤務表バブル（グリッド + 世界線ビュー / 可能勤務帯へのリンク） ---
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
          "bottom-side"
        )
      }
      onOpenAvailability={() =>
        openBubble(
          `hotel-shift-puzzle/schedules/${scheduleId}/availability`,
          bubble.id,
          "right-side"
        )
      }
      onOpenViolation={(violationKey) =>
        openBubble(
          `hotel-shift-puzzle/schedules/${scheduleId}/violations/${violationKey}`,
          bubble.id,
          "top-side"
        )
      }
    />
  );
};

// --- 制約違反バブル（赤線クリックで開く） ---
const ScheduleViolationBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(
    <ScheduleViolationView
      scheduleId={bubble.params.scheduleId}
      violationKey={bubble.params.violationKey}
    />
  );

// --- 勤務表の世界線ビューバブル（canvas版） ---
const ScheduleWorldLineBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<ScheduleWorldLineView scheduleId={bubble.params.scheduleId} />);

// --- 可能勤務帯エディタバブル ---
const AvailabilityBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<AvailabilityEditor scheduleId={bubble.params.scheduleId} />);

/** このバブリのバブルルート定義 */
export const hotelShiftPuzzleBubbleRoutes: BubbleRoute[] = [
  { pattern: "hotel-shift-puzzle/staffs/:staffId/shift-wish/:year/:month", type: "staff-shift-wish", Component: ShiftWishBubble },
  { pattern: "hotel-shift-puzzle/staffs/:staffId", type: "staff", Component: StaffDetailBubble },
  { pattern: "hotel-shift-puzzle/staffs", type: "staff-list", Component: StaffListBubble },
  { pattern: "hotel-shift-puzzle/work-shifts", type: "work-shift-list", Component: WorkShiftListBubble },
  // 世界線ビューは画面下部の左右いっぱいストリップ（popChildViewPortBelow）で開く。
  // canvas を透かすため背景は半透明ダーク（igo の世界線ビューに揃える）。
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/history", type: "schedule-history", Component: ScheduleWorldLineBubble, bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)" } },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/availability", type: "schedule-availability", Component: AvailabilityBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/violations/:violationKey", type: "schedule-violation", Component: ScheduleViolationBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedules", type: "schedule-list", Component: ScheduleListBubble },
];
