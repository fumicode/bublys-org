/**
 * ドメイン層エクスポート
 */

// Staff（スタッフ）
export * from './staff/Staff.js';

// 月間スタッフ勤務表（シフト表）
export * from './schedule/WorkingDay.js';
export * from './schedule/WorkShift.js';
export * from './schedule/WorkShiftSet.js';
export * from './schedule/ShiftAssignment.js';
export * from './schedule/resolveShiftInput.js';
export * from './schedule/RequiredStaffing.js';
export * from './schedule/StaffMonthlyShiftWish.js';
export * from './schedule/MonthlyStaffSchedule.js';
export * from './schedule/ScheduleAvailability.js';
// 稼働日ごとの予約状況（宿泊人数・部屋数）。勤務表に紐づく姉妹集約。店ごとに付け替える想定。
export * from './schedule/DailyReservationInfo.js';
export * from './schedule/ScheduleReport.js';
// 操作履歴（ノウハウ可視化。勤務表ローカル世界線に相乗り）
export * from './schedule/ScheduleEditLog.js';

// 責任者の宣言的ルール（集合のうち最低 minCount 人が勤務帯Xに入る ＝ ORルール）
export * from './schedule/ShiftLeaderRule.js';
// 責任者ルールを違反を出す制約として扱うアダプタ（未充足日を日単位の違反に）
export * from './schedule/ShiftLeaderConstraint.js';
// 勤務表ごとの制約集約（責任者ルールを保持。将来は他の制約も同居可）
export * from './schedule/ScheduleConstraints.js';

// 段階的な自動シフト（ステップ＝コマンド。共通型 AutoShiftStep に揃える）
export * from './schedule/autoShiftStep.js';
export * from './schedule/fulfillWishesStep.js';
export * from './schedule/fillDemandStep.js';
export * from './schedule/fillDemandBalancedStep.js';
export * from './schedule/partnerCoverStep.js';
export * from './schedule/satisfyLeaderRulesStep.js';
export * from './schedule/minDayOffStep.js';
export * from './schedule/autoShiftSteps.js';

// 制約（シフト表が満たすべきルール）
export * from './schedule/ConstraintViolation.js';
export * from './schedule/ScheduleConstraint.js';
export * from './schedule/MaxConsecutiveWorkdaysConstraint.js';
export * from './schedule/MinMonthlyDayOffConstraint.js';
export * from './schedule/MaxDayOffPerDayConstraint.js';

// 学習コーパス（世界線 + EditLog から抽出）
export * from './learning/index.js';
