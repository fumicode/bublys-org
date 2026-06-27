/**
 * ドメイン層エクスポート
 */

// Staff（スタッフ）
export * from './staff/Staff.js';

// 月間スタッフ勤務表（シフト表）
export * from './schedule/WorkingDay.js';
export * from './schedule/WorkShift.js';
export * from './schedule/ShiftAssignment.js';
export * from './schedule/RequiredStaffing.js';
export * from './schedule/StaffMonthlyShiftWish.js';
export * from './schedule/MonthlyStaffSchedule.js';
export * from './schedule/ScheduleAvailability.js';

// 責任者ロール（勤務帯ごとに「責任者が各稼働日に最低1人いる」要件）
export * from './schedule/ShiftLeaderRole.js';

// 段階的な自動シフト（ステップ＝コマンド。共通型 AutoShiftStep に揃える）
export * from './schedule/autoShiftStep.js';
export * from './schedule/fulfillWishesStep.js';
export * from './schedule/fillDemandStep.js';
export * from './schedule/fillDemandBalancedStep.js';
export * from './schedule/partnerCoverStep.js';
export * from './schedule/autoShiftSteps.js';

// 制約（シフト表が満たすべきルール）
export * from './schedule/ConstraintViolation.js';
export * from './schedule/ScheduleConstraint.js';
export * from './schedule/MaxConsecutiveWorkdaysConstraint.js';
