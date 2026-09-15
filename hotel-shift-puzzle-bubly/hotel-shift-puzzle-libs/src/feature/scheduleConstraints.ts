/**
 * scheduleConstraints — 勤務表に適用する制約のリスト（単一ソース）
 *
 * グリッド（赤線表示）と違反バブル（詳細表示）の両方が、ここで定義した同じ制約で
 * checkConstraints する。制約は勤務表の state には保存せず、ここから注入する。
 *
 * いずれ「店舗ごと／勤務表ごとに制約を設定」できるようにする場合も、その設定を解決して
 * ScheduleConstraint[] を返す入口をここに集約する想定。
 */
import type {
  ConstraintSet,
  ScheduleConstraint,
  StaffMonthlyShiftWish,
  WorkShift,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftWishConstraint } from "./ShiftWishConstraint.js";

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
 * 各制約は宣言的オブジェクト（ScheduleConstraint）で、その設定値は勤務表ごとの
 * ConstraintSet 集約（世界線に載る）が持つ。model 層で完結する制約（責任者・連勤・
 * 月最低休日・1日の休み上限）は集約の modelConstraints() から渡し、ここでは希望違反
 * （ShiftWishConstraint。feature 層＋実行時データ依存）だけを足して組み立てる。
 */
export type BuildScheduleConstraintsArgs = {
  /** model 層の制約（集約の modelConstraints() から渡す）。 */
  modelConstraints?: ScheduleConstraint[];
  /** 希望違反も見るなら希望の文脈を渡す（省略時は希望チェックなし）。 */
  wish?: ScheduleConstraintContext;
};

export const buildScheduleConstraints = (
  args: BuildScheduleConstraintsArgs = {}
): ScheduleConstraint[] => {
  const constraints: ScheduleConstraint[] = [...(args.modelConstraints ?? [])];
  if (args.wish) constraints.push(new ShiftWishConstraint(args.wish));
  return constraints;
};

/**
 * **その勤務表に効く制約リスト。** 違反表示（赤線・違反バブル）と自動シフトは、これで組んだ
 * 同じリストを使う。別々に組むと「画面は違反と言うのに自動シフトはそれを作る」がずれて起きる。
 *
 * - 制約セットの制約（連勤・責任者・勤務間インターバル・休日・休み上限・必要人数）
 * - 希望チェックが入なら、シフト希望との食い違い（制約セットがまだ読めないときは既定の入）
 *
 * @param wishByStaff その勤務表と同じ年月のシフト希望（staffId → 希望）
 */
export const scheduleConstraintsOf = (args: {
  constraintSet: ConstraintSet | undefined;
  workShifts: WorkShift[];
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
}): ScheduleConstraint[] => {
  const { constraintSet, workShifts, wishByStaff } = args;
  const shiftIdsOf = (shiftName: string) =>
    workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  return buildScheduleConstraints({
    modelConstraints: constraintSet?.modelConstraints(shiftIdsOf),
    wish: (constraintSet?.checkShiftWish ?? true) ? { wishByStaff, shiftNameById } : undefined,
  });
};
