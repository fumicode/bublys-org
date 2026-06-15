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
} from "@bublys-org/hotel-shift-puzzle-model";

/** 連勤上限（日数）。いまは固定。 */
export const MAX_CONSECUTIVE_WORKDAYS_LIMIT = 5;

/** いま適用する制約の一覧 */
export const defaultScheduleConstraints = (): ScheduleConstraint[] => [
  new MaxConsecutiveWorkdaysConstraint(MAX_CONSECUTIVE_WORKDAYS_LIMIT),
];
