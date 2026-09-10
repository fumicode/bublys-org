/**
 * 画面上の「もの」としてのオブジェクト型名。
 *
 * ここに置くのは、世界線に保存される集約（`objects/hotelObjects.tsx` の HOTEL_OBJECTS）
 * ではないが、**画面の上ではひとつの「もの」として振る舞う**もの。
 * ObjectView の約束（オブジェクトを表し、ドラッグでき、ダブルクリックでバブルが開く）を
 * 満たすには型名が要るので、ここで名前を付ける。
 *
 * 集約と違うのは、単独では保存されないこと。だから CAS の記述子は持たず、ドラッグ種別と
 * アイコンだけを登録する（`object-type-registration.ts`）。
 *
 * URL は app 層から注入される（型に固定の id が無く、どの月か・誰の分か、で決まるため
 * `registerObjectUrl` の id → url が使えない）。
 */

/** その月のシフト希望（スタッフ全員 × 回収状況の一覧） */
export const SHIFT_WISH_MONTH_VIEW_TYPE = "ShiftWishMonth";

/**
 * ひとりぶんの希望入力表（スタッフ×月）。
 *
 * 集約 StaffMonthlyShiftWish そのものではなく「その人のその月の入力表」という画面上の
 * もの。まだ一度も入力していない月は集約が存在しないが、入力表は開けるので型名は要る。
 */
export const STAFF_SHIFT_WISH_SHEET_VIEW_TYPE = "StaffShiftWishSheet";
