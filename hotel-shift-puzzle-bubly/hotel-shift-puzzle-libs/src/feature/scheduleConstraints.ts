/**
 * scheduleConstraints — 勤務表に適用する制約のリスト（単一ソース）
 *
 * グリッド（赤線表示）と違反バブル（詳細表示）の両方が、ここで定義した同じ制約で
 * checkConstraints する。制約は勤務表の state には保存せず、ここから注入する。
 *
 * いずれ「店舗ごと／勤務表ごとに制約を設定」できるようにする場合も、その設定を解決して
 * ScheduleConstraint[] を返す入口をここに集約する想定。
 */
import {
  ScheduleConstraint,
  MaxConsecutiveWorkdaysConstraint,
  StaffMonthlyShiftWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishConstraint } from "./ShiftWishConstraint.js";

/** 連勤上限（日数）。いまは固定。 */
export const MAX_CONSECUTIVE_WORKDAYS_LIMIT = 5;

/** シフト希望との食い違い判定に必要な文脈（希望と勤務帯名）。 */
export type ScheduleConstraintContext = {
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  shiftNameById: Map<string, string>;
};

/**
 * 勤務表に適用する制約一覧。グリッドと違反バブルの両方が同じものを使う。
 * 希望の文脈（ctx）が与えられればシフト希望違反も含める。
 */
export const buildScheduleConstraints = (
  ctx?: ScheduleConstraintContext
): ScheduleConstraint[] => {
  const constraints: ScheduleConstraint[] = [
    new MaxConsecutiveWorkdaysConstraint(MAX_CONSECUTIVE_WORKDAYS_LIMIT),
  ];
  if (ctx) constraints.push(new ShiftWishConstraint(ctx));
  return constraints;
};

/** 後方互換：希望なしの既定制約。 */
export const defaultScheduleConstraints = (): ScheduleConstraint[] =>
  buildScheduleConstraints();
