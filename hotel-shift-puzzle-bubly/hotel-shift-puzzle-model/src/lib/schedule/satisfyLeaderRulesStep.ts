/**
 * makeSatisfyLeaderRulesStep — 自動シフトのステップ「責任者制約を満たす」
 *
 * 宣言的ルール `ShiftLeaderRule`（「責任者集合のうち最低 minCount 人が担当勤務帯に入る」）を
 * 渡された分すべて、各稼働日で満たしにいくコマンド。相方裏（一方が休みのときだけ埋める）と違い、
 * 「毎日その勤務帯に責任者が最低人数いる」よう積極的に埋める。
 *
 * 各稼働日・各ルールについて、充足するまで「未定・その帯に入れる・出勤可能な責任者」を入れる。
 *
 * 大原則は他ステップと同じ：人間入力済みのセルは上書きしない／休み希望は尊重（未定のみ触る）。
 * 純粋・不変。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { wouldExceedConsecutive } from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";

export function makeSatisfyLeaderRulesStep(rules: ShiftLeaderRule[]): AutoShiftStep {
  return {
    key: "satisfy-leader-rules",
    label: "責任者制約を満たす",
    description:
      "責任者ルール（早責など）を、毎日その勤務帯に最低人数の責任者が入るよう満たします（未定セルだけ／人間入力・休み希望は尊重）。",

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const isAvailable = ctx.isAvailable ?? (() => true);
      const max = ctx.maxConsecutive ?? 5;
      let result = schedule;
      let assigned = 0;

      for (const day of schedule.workingDays()) {
        for (const rule of rules) {
          const coverShiftId = ctx.shiftIdByName.get(rule.shiftName);
          if (!coverShiftId || !result.hasWorkShift(coverShiftId)) continue;
          const coverShiftIds = new Set([coverShiftId]);

          // 充足するまで（minCount 人埋まるまで／候補が尽きるまで）責任者を入れる
          while (!rule.isSatisfiedOn(result, day, coverShiftIds)) {
            const leader = rule.leaderStaffIds.find(
              (id) =>
                result.isUndecided(id, day) &&
                isAvailable(id, coverShiftId) &&
                ctx.preferenceOf(id, day).kind !== "day-off" &&
                !wouldExceedConsecutive(result, id, day, max)
            );
            if (!leader) break; // これ以上埋められない
            result = result.assignShift(leader, day, coverShiftId);
            assigned++;
          }
        }
      }

      return {
        schedule: result,
        assigned,
        message: `責任者制約を満たすため ${assigned}件を配置しました。`,
      };
    },
  };
}
