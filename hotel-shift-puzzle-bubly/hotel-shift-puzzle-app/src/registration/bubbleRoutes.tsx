"use client";

import { useContext, type ReactNode } from "react";
import { BubbleRoute, BubblesContext, type OpeningPosition } from "@bublys-org/bubbles-ui";
import {
  StaffCollection,
  StaffDetail,
  WorkShiftCollection,
  ScheduleCollection,
  ScheduleGrid,
  ScheduleDayDetail,
  ScheduleReservationInfoDetail,
  AutoShiftPanel,
  ExtractedSchedule,
  HotelObjectsProvider,
  ScheduleWorldLineView,
  ScheduleWorldLineTreeView,
  AvailabilityEditor,
  ScheduleViolationView,
  ShiftWishEditor,
  LeaderRuleView,
  ScheduleReportPanel,
  ScheduleReportList,
} from "@bublys-org/hotel-shift-puzzle-libs";
// バブル URL スキーム（app 層で一元管理）。import すると同時にオブジェクト URL の
// registerObjectUrl 副作用も走る。
import {
  scheduleDayUrl,
  scheduleViolationUrl,
  scheduleAvailabilityUrl,
  scheduleReservationInfoUrl,
  scheduleWorldLineUrl,
  scheduleAutoShiftUrl,
  scheduleLeaderRuleUrl,
  scheduleReportUrl,
  scheduleReportListUrl,
  scheduleWorldLineTreeUrl,
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
          "bubble-side-right"
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
// 「シフト完成レポート一覧」から過去レポートを参照できる（次回シフト作成前の参考用）。
const ScheduleListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  return withObjects(
    <ScheduleCollection
      onOpenReports={() =>
        openBubble(scheduleReportListUrl(), bubble.id, "bubble-side-right")
      }
    />
  );
};

// --- 月間スタッフ勤務表バブル（グリッド + 可能勤務帯 / 世界線 / 自動シフトへのリンク） ---
// 「完成レポートを作成」で新しいシフト完成レポートバブル＋キセキの木バブルを開く
// （勤務表バブルを opener に）。キセキの木→レポートの順で開き、レポートは
// キセキの木バブルを opener にして bubble-side-right で開くことで横並びにする。
const ScheduleBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const scheduleId = bubble.params.scheduleId;
  // バブル URL のスキームは app 層（ここ）の関心事。
  // 可能勤務帯・世界線・自動シフトは、勤務表バブルを opener にして bubble-side で開く。
  // 同じ URL をボタンの data-url（*Url props）にも渡すことで、ボタンから link bubble が伸びる。
  const availabilityUrl = scheduleAvailabilityUrl(scheduleId);
  const worldLineUrl = scheduleWorldLineUrl(scheduleId);
  const autoShiftUrl = scheduleAutoShiftUrl(scheduleId);
  // 各アクションの方向は元のバブル配置（右＝可能勤務帯、下＝世界線、上＝違反）を踏襲する。
  const openSide = (url: string, position: OpeningPosition) =>
    openBubble(url, bubble.id, position);
  // 抽出はクリックした要素（バッジ／抽出ボタン）の近くに出したいので origin-side で開く
  const openOrigin = (url: string) => openBubble(url, bubble.id, "origin-side");
  const treeUrl = scheduleWorldLineTreeUrl(scheduleId);
  return withObjects(
    <ScheduleGrid
      scheduleId={scheduleId}
      onOpenAvailability={() => openSide(availabilityUrl, "bubble-side-right")}
      onOpenHistory={() => openSide(worldLineUrl, "bubble-side-bottom")}
      onOpenTree={() => openSide(treeUrl, "bubble-side-bottom")}
      onOpenAutoShift={() => openSide(autoShiftUrl, "bubble-side-right")}
      onConfirm={(reportId) => {
        const treeBubbleId = openSide(treeUrl, "bubble-side-bottom");
        openBubble(scheduleReportUrl(reportId), treeBubbleId, "bubble-side-right");
      }}
      availabilityUrl={availabilityUrl}
      worldLineUrl={worldLineUrl}
      treeUrl={treeUrl}
      autoShiftUrl={autoShiftUrl}
      ruleBubbleUrl={(ruleKey) => scheduleLeaderRuleUrl(scheduleId, ruleKey)}
      onOpenRule={(ruleKey) => openOrigin(scheduleLeaderRuleUrl(scheduleId, ruleKey))}
      dayBubbleUrl={(dayKey) => scheduleDayUrl(scheduleId, dayKey)}
      violationBubbleUrl={(violationKey) =>
        scheduleViolationUrl(scheduleId, violationKey)
      }
      reservationInfoUrl={scheduleReservationInfoUrl(scheduleId)}
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

// --- 予約状況 詳細バブル（勤務表の予約行クリックで開く。稼働日ごとの宿泊人数・部屋数を入力） ---
const ScheduleReservationInfoBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<ScheduleReservationInfoDetail scheduleId={bubble.params.scheduleId} />);

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

// --- シフト完成レポートバブル（勤務表の「完成レポートを作成」から開く） ---
const ScheduleReportBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<ScheduleReportPanel reportId={bubble.params.reportId} />);

// --- シフト完成レポート一覧バブル（勤務表一覧の「シフト完成レポート一覧」から開く） ---
const ScheduleReportListBubble: BubbleRoute["Component"] = () =>
  withObjects(<ScheduleReportList />);

// --- 勤務表のキセキの木ビューバブル（SVG版・読み取り専用） ---
const ScheduleWorldLineTreeBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(<ScheduleWorldLineTreeView scheduleId={bubble.params.scheduleId} />);

// --- 責任者ルール可視化バブル（上部ルール行のクリックで開く） ---
const LeaderRuleBubble: BubbleRoute["Component"] = ({ bubble }) =>
  withObjects(
    <LeaderRuleView
      scheduleId={bubble.params.scheduleId}
      ruleKey={bubble.params.ruleKey}
    />
  );

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
  // canvas は容器いっぱいに広がるので fillsContainer（窓型レイアウト）で開く。universe ではない
  // ので普通の BubbleView（クリック可）として描かれ、窓をリサイズすると canvas も伸縮する。
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/world-line", type: "schedule-world-line", Component: ScheduleWorldLineBubble, bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)", fillsContainer: true, defaultSize: { width: 400, height: 300 } } },
  // キセキの木ビューも同じくSVGを透かすため背景は半透明ダークに揃える。
  // 木の全体像をゆったり眺められるよう、世界線ビューより大きめの窓（fillsContainer）で開く。
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/tree", type: "schedule-tree", Component: ScheduleWorldLineTreeBubble, bubbleOptions: { contentBackground: "rgba(15,18,28,0.3)", fillsContainer: true, defaultSize: { width: 700, height: 500 } } },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/leader-rules/:ruleKey", type: "schedule-leader-rule", Component: LeaderRuleBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/availability", type: "schedule-availability", Component: AvailabilityBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/auto-shift", type: "schedule-auto-shift", Component: AutoShiftBubble },
  // 抽出バブルはフロストガラス調：背景を半透明にして裏がうっすら見えるようにする（ぼかしは中で付与）
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/extract/:staffIds", type: "schedule-extract", Component: ExtractedScheduleBubble, bubbleOptions: { contentBackground: "hsla(0, 0%, 100%, 0.5)" } },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/violations/:violationKey", type: "schedule-violation", Component: ScheduleViolationBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/days/:dayKey", type: "schedule-day", Component: ScheduleDayBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId/reservation-info", type: "schedule-reservation-info", Component: ScheduleReservationInfoBubble },
  { pattern: "hotel-shift-puzzle/schedules/:scheduleId", type: "schedule", Component: ScheduleBubble },
  { pattern: "hotel-shift-puzzle/schedules", type: "schedule-list", Component: ScheduleListBubble },
  // シフト完成レポート（#86〜#89）。list は `/schedule-reports`、単体は `/schedule-reports/:reportId`
  // （schedules/schedule-list と同じ命名パターン）。
  { pattern: "hotel-shift-puzzle/schedule-reports/:reportId", type: "schedule-report", Component: ScheduleReportBubble },
  { pattern: "hotel-shift-puzzle/schedule-reports", type: "schedule-report-list", Component: ScheduleReportListBubble },
];
