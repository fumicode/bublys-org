/**
 * makeSatisfyLeaderRulesStep — 自動シフトのステップ「責任者制約を満たす」
 *
 * 宣言的ルール `ShiftLeaderRule`（「責任者集合のうち最低 minCount 人が担当勤務帯に入る」）を
 * 渡された分すべて、各稼働日で満たしにいくコマンド。相方裏（一方が休みのときだけ埋める）と違い、
 * 「毎日その勤務帯に責任者が最低人数いる」よう積極的に埋める。
 *
 * 各稼働日・各ルールについて、充足するまで責任者（未定・その帯に入れる）を入れる。
 * 誰を入れるかは「日ごとの輪番」で選ぶ：(稼働日index + phase) を起点に責任者を回すので、
 * 同じ人に偏らず交代で入り、結果として全員が休める余地が生まれる。phase を変えると
 * 「誰がどの日に入るか」が変わるので、完成案の複数生成（世界線）に使える。
 *
 * 大原則は他ステップと同じ：人間入力済みのセルは上書きしない／休み希望は尊重（未定のみ触る）。
 * 純粋・不変（乱数なし。違いは phase で決定的に出す）。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { wouldExceedConsecutive } from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";

export type SatisfyLeaderRulesOptions = {
  /** 担当者を回す輪番の起点ズラし（複数案の生成に使う。既定 0） */
  phase?: number;
};

export function makeSatisfyLeaderRulesStep(
  rules: ShiftLeaderRule[],
  opts: SatisfyLeaderRulesOptions = {}
): AutoShiftStep {
  const phase = opts.phase ?? 0;
  return {
    key: phase === 0 ? "satisfy-leader-rules" : `satisfy-leader-rules:p${phase}`,
    label: "責任者制約を満たす",
    description:
      "責任者ルール（早責など）を、毎日その勤務帯に最低人数の責任者が入るよう満たします（担当は日ごとに交代／未定セルだけ／人間入力・休み希望は尊重）。",

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const isAvailable = ctx.isAvailable ?? (() => true);
      const max = ctx.maxConsecutive ?? 5;
      let result = schedule;
      let assigned = 0;

      schedule.workingDays().forEach((day, dayIndex) => {
        for (const rule of rules) {
          const coverShiftId = ctx.shiftIdByName.get(rule.shiftName);
          if (!coverShiftId || !ctx.shiftNameById.has(coverShiftId)) continue;
          const coverShiftIds = new Set([coverShiftId]);

          // 充足するまで（minCount 人埋まるまで／候補が尽きるまで）責任者を入れる。
          // 候補は「(dayIndex + phase) を起点に回した順」で選び、日ごとに担当を交代させる。
          while (!rule.isSatisfiedOn(result, day, coverShiftIds)) {
            const eligible = rule.leaderStaffIds.filter(
              (id) =>
                result.isUndecided(id, day) &&
                isAvailable(id, coverShiftId) &&
                ctx.preferenceOf(id, day).kind !== "day-off" &&
                !wouldExceedConsecutive(result, id, day, max)
            );
            if (eligible.length === 0) break; // これ以上埋められない
            const start = ((dayIndex + phase) % eligible.length + eligible.length) % eligible.length;
            const leader = eligible[start];
            result = result.assignShift(leader, day, coverShiftId);
            assigned++;
          }
        }
      });

      return {
        schedule: result,
        assigned,
        message: `責任者制約を満たすため ${assigned}件を配置しました。`,
      };
    },
  };
}
