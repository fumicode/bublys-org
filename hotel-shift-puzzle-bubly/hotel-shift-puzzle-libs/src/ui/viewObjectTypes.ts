/**
 * 画面上の「もの」としてのオブジェクト型名。
 *
 * ここに置くのは、世界線に保存される集約（`objects/hotelObjects.tsx` の HOTEL_OBJECTS）
 * ではないが、**画面の上ではひとつの「もの」として振る舞う**もの。
 * ObjectView の約束（オブジェクトを表し、ドラッグでき、ダブルクリックでバブルが開く）を
 * 満たすには型名が要るので、ここで名前を付ける。
 *
 * 集約と違うのは、単独では保存されないこと。勤務日は勤務表の中の1日だし、責任者ルールは
 * 制約オブジェクトの中の1件で、どちらも親の集約に属している。だから CAS の記述子は持たず、
 * ドラッグ種別とアイコンだけを登録する（`object-type-registration.ts`）。
 *
 * URL は app 層から注入される（型に固定の id が無く、どの勤務表の何日か・どの月か・
 * 誰の分か、で決まるため `registerObjectUrl` の id → url が使えない）。
 */

/** 勤務表の稼働日（グリッドの日付ヘッダ） */
export const SCHEDULE_DAY_VIEW_TYPE = "ScheduleDay";

/** 責任者ルール（早責・予責・夜責 …の制約アイコン） */
export const SCHEDULE_LEADER_RULE_VIEW_TYPE = "ScheduleLeaderRule";

/** 世界線ビュー（この勤務表のこれまでの分岐） */
export const SCHEDULE_WORLD_LINE_VIEW_TYPE = "ScheduleWorldLine";

/** キセキの木ビュー（世界線を木で描いた読み取り専用ビュー） */
export const SCHEDULE_WORLD_LINE_TREE_VIEW_TYPE = "ScheduleWorldLineTree";

/** シフト完成レポート一覧 */
export const SCHEDULE_REPORT_LIST_VIEW_TYPE = "ScheduleReportList";

/** 数と真偽で言い切れる制約1つ（連勤・休日・休み上限・希望）。バブルで開いて直す */
export const CONSTRAINT_LIMIT_VIEW_TYPE = "ConstraintLimit";

/** 勤務間インターバルのルール1つ。バブルで開いて図を見る */
export const SHIFT_INTERVAL_RULE_VIEW_TYPE = "ShiftIntervalRule";
/** その月のシフト希望（スタッフ全員 × 回収状況の一覧） */
export const SHIFT_WISH_MONTH_VIEW_TYPE = "ShiftWishMonth";

/**
 * ひとりぶんの希望入力表（スタッフ×月）。
 *
 * 集約 StaffMonthlyShiftWish そのものではなく「その人のその月の入力表」という画面上の
 * もの。まだ一度も入力していない月は集約が存在しないが、入力表は開けるので型名は要る。
 */
export const STAFF_SHIFT_WISH_SHEET_VIEW_TYPE = "StaffShiftWishSheet";
