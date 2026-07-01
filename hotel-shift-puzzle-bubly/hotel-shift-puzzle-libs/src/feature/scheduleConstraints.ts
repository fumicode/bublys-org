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
  ShiftLeaderConstraint,
  MaxConsecutiveWorkdaysConstraint,
  StaffMonthlyShiftWish,
  DEFAULT_MAX_CONSECUTIVE_WORKDAYS,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishConstraint } from "./ShiftWishConstraint.js";

/** スタッフが月に休まなければならない最低日数。いまは固定（将来は会社ごとに注入）。 */
export const MIN_MONTHLY_DAY_OFF = 8;

/** 1日に休んでよい人数の上限。これを超えないよう休みを配分する（将来は会社ごとに注入）。 */
export const MAX_DAY_OFF_PER_DAY = 8;

/** 休みの複数案を何案つくるか（世界線で見比べる） */
export const DAY_OFF_CANDIDATE_COUNT = 3;

/** シフト希望との食い違い判定に必要な文脈（希望と勤務帯名）。 */
export type ScheduleConstraintContext = {
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  shiftNameById: Map<string, string>;
};

/**
 * 勤務表に適用する制約一覧を組み立てる（グリッド・違反バブルが共有）。
 *
 * 制約の設定値（連勤上限・希望を見るか・責任者ルール）は勤務表ごとの ScheduleConstraints 集約
 * （世界線に載る）が持つ。ここはその設定＋実行時の文脈（希望データ）から ScheduleConstraint[]
 * を「組み立てる」だけ。希望違反（ShiftWishConstraint）は feature 層＋実行時データ依存なので
 * ここで足す。
 */
export type BuildScheduleConstraintsArgs = {
  /** 連勤上限（日数）。省略時 既定値。 */
  maxConsecutiveWorkdays?: number;
  /** 責任者制約（未充足日を違反にする）。集約から解決して渡す。省略時なし。 */
  leaderConstraints?: ShiftLeaderConstraint[];
  /** 希望違反も見るなら希望の文脈を渡す（省略時は希望チェックなし）。 */
  wish?: ScheduleConstraintContext;
};

export const buildScheduleConstraints = (
  args: BuildScheduleConstraintsArgs = {}
): ScheduleConstraint[] => {
  const constraints: ScheduleConstraint[] = [
    new MaxConsecutiveWorkdaysConstraint(
      args.maxConsecutiveWorkdays ?? DEFAULT_MAX_CONSECUTIVE_WORKDAYS
    ),
    ...(args.leaderConstraints ?? []),
  ];
  if (args.wish) constraints.push(new ShiftWishConstraint(args.wish));
  return constraints;
};
