"use client";

import { useContext, type ReactNode } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  StaffCollection,
  StaffDetail,
  WorkShiftCollection,
  ScheduleCollection,
  ScheduleGrid,
  ScheduleDayDetail,
  AutoShiftPanel,
  ExtractedSchedule,
  HotelObjectsProvider,
  ScheduleWorldLineView,
  AvailabilityEditor,
  ScheduleViolationView,
  ShiftWishEditor,
} from "@bublys-org/hotel-shift-puzzle-libs";
// バブル URL スキーム（app 層で一元管理）。import すると同時にオブジェクト URL の
// registerObjectUrl 副作用も走る。
import {
  scheduleDayUrl,
  scheduleViolationUrl,
  scheduleAvailabilityUrl,
  scheduleWorldLineUrl,
  scheduleAutoShiftUrl,
  scheduleExtractUrl,
} from "./bubbleUrls.js";

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
          "bubble-side"
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

// --- 月間スタッフ勤務表バブル（グリッド + 可能勤務帯 / 世界線 / 自動シフトへのリンク） ---
const ScheduleBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const scheduleId = bubble.params.scheduleId;
  // バブル URL のスキームは app 層（ここ）の関心事。
  // 可能勤務帯・世界線・自動シフトは、勤務表バブルを opener にして bubble-side で開く。
  // 同じ URL をボタンの data-url（*Url props）にも渡すことで、ボタンから link bubble が伸びる。
  const availabilityUrl = scheduleAvailabilityUrl(scheduleId);
  const worldLineUrl = scheduleWorldLineUrl(scheduleId);
  const autoShiftUrl = scheduleAutoShiftUrl(scheduleId);
  const openSide = (url: string) => openBubble(url, bubble.id, "bubble-side");
  // 抽出はクリックした要素（バッジ／抽出ボタン）の近くに出したいので origin-side で開く
  const openOrigin = (url: string) => openBubble(url, bubble.id, "origin-side");
  return withObjects(
    <ScheduleGrid
      scheduleId={scheduleId}
      onOpenAvailability={() => openSide(availabilityUrl)}
      onOpenHistory={() => openSide(worldLineUrl)}
      onOpenAutoShift={() => openSide(autoShiftUrl)}
      availabilityUrl={availabilityUrl}
      worldLineUrl={worldLineUrl}
      autoShiftUrl={autoShiftUrl}
      onOpenExtract={(staffIds) => openOrigin(scheduleExtractUrl(scheduleId, staffIds))}
      extractBubbleUrl={(staffIds) => scheduleExtractUrl(scheduleId, staffIds)}
      dayBubbleUrl={(dayKey) => scheduleDayUrl(scheduleId, dayKey)}
      violationBubbleUrl={(violationKey) =>
        scheduleViolationUrl(scheduleId, violationKey)
      }
    />
  );
};

// --- 自動シフト パネルバブル（勤務表の「🪄 自動シフト」ボタンから開く） ---
const AutoShiftBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<AutoShiftPanel scheduleId={bubble.params.scheduleId} />);

// --- 抽出勤務表バブル（選択スタッフだけの勤務表。「抽出」ボタンから開く） ---
const ExtractedScheduleBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(
    <ExtractedSchedule
      scheduleId={bubble.params.scheduleId}
      staffIds={(bubble.params.staffIds ?? "").split(",").filter(Boolean)}
    />
  );

// --- 稼働日 詳細バブル（勤務表の日付ヘッダクリックで開く） ---
const ScheduleDayBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(
    <ScheduleDayDetail
      scheduleId={bubble.params.scheduleId}
      dayKey={bubble.params.dayKey}
    />
  );

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
  // 世界線ビューは左下のボタンを opener に bubble-side で開く（canvas を透かす半透明ダーク背景）。
  // URL は /history だと bubbles-ui が下部ストリップ展開に特別扱いするため /world-line にしている。
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/world-line", type: "schedule-world-line", Component: ScheduleWorldLineBubble, bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)" } },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/availability", type: "schedule-availability", Component: AvailabilityBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/auto-shift", type: "schedule-auto-shift", Component: AutoShiftBubble },
  // 抽出バブルはフロストガラス調：背景を半透明にして裏がうっすら見えるようにする（ぼかしは中で付与）
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/extract/:staffIds", type: "schedule-extract", Component: ExtractedScheduleBubble, bubbleOptions: { contentBackground: "hsla(0, 0%, 100%, 0.5)" } },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/violations/:violationKey", type: "schedule-violation", Component: ScheduleViolationBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/days/:dayKey", type: "schedule-day", Component: ScheduleDayBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedules", type: "schedule-list", Component: ScheduleListBubble },
];
