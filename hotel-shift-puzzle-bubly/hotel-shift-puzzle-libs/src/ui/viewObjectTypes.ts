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
 * URL は app 層から注入される（型に固定の id が無く、どの勤務表の何日か、で決まるため
 * `registerObjectUrl` の id → url が使えない）。
 */

/** 勤務表の稼働日（グリッドの日付ヘッダ） */
export const SCHEDULE_DAY_VIEW_TYPE = "ScheduleDay";

/** 責任者ルール（早責・予責・夜責 …の制約アイコン） */
export const SCHEDULE_LEADER_RULE_VIEW_TYPE = "ScheduleLeaderRule";
