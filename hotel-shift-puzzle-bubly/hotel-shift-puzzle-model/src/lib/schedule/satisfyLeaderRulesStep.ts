/**
 * makeSatisfyLeaderRulesStep — 自動シフトのステップ「責任者制約を満たす」
 *
 * 宣言的ルール `ShiftLeaderRule`（「責任者集合のうち最低 minCount 人が担当勤務帯に入る」）を
 * 渡された分すべて、各稼働日で満たしにいくコマンド。相方裏（一方が休みのときだけ埋める）と違い、
 * 「毎日その勤務帯に責任者が最低人数いる」よう積極的に埋める。
 *
 * hidden-single（Sudoku用語）方式で確定する: その枠を埋められる候補のうち、
 * 「他の責任者ルールでも一意に必要」な人（isCriticalElsewhere）を除いた残りが
 * ちょうど必要人数（remainingNeed）以下なら、その全員を強制的に確定する
 * （minCount=1 なら候補1人＝naked single、minCount>1 でも同じ考え方＝hidden set）。
 * 除外後もなお必要人数を超える候補が残る場合や、除外の結果0人になってしまう場合は、
 * 本当に選択の余地がある（or 取り合いになっている）とみなし、確定させず
 * ambiguousLeaderSlots に記録して人間 or 次の3案生成ステップに委ねる。
 *
 * 大原則は他ステップと同じ：人間入力済みのセルは上書きしない／休み希望は尊重（未定のみ触る）。
 * 純粋・不変（乱数なし。等価な複数解が残る場合は確定させず未定のまま残す）。
 *
 * 既知の限界（安全側に倒れて確定を保留するだけで、誤った確定はしない）:
 *   - 同日内の2ルール間の兼務のみ考慮する。3ルール以上が絡む連鎖的な取り合いまでは解かない。
 *   - 「他ルールで必要」判定は同日限定。ある人が別日のもう一つのルールで一意に必要、
 *     というケースは見ない（wouldExceedConsecutive の日またぎ連鎖とは別の話）。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
  AmbiguousLeaderSlot,
} from "./autoShiftStep.js";
import { wouldExceedConsecutive } from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";
import type { WorkingDay } from "./WorkingDay.js";

/**
 * @param rules 今回対象にするルール（今まで通り「今回抽出/選択中のロール」だけを渡す）。
 * @param allRules 宣言済みの全責任者ルール（兼務チェック用。rules を含んでいてよい）。
 */
export function makeSatisfyLeaderRulesStep(
  rules: ShiftLeaderRule[],
  allRules: ShiftLeaderRule[]
): AutoShiftStep {
  return {
    key: "satisfy-leader-rules",
    label: "責任者制約を満たす",
    description:
      "責任者ルール（早責など）を、毎日その勤務帯に最低人数の責任者が入るよう満たします（他の責任者ルールと兼務している人は取り合いにならないよう考慮／未定セルだけ／人間入力・休み希望は尊重）。",

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const isAvailable = ctx.isAvailable ?? (() => true);
      const max = ctx.maxConsecutive ?? 5;
      let result = schedule;
      let assigned = 0;
      const ambiguousLeaderSlots: AmbiguousLeaderSlot[] = [];

      const resolveCoverShiftId = (rule: ShiftLeaderRule): string | undefined => {
        const coverShiftId = ctx.shiftIdByName.get(rule.shiftName);
        if (!coverShiftId || !ctx.shiftNameById.has(coverShiftId)) return undefined;
        return coverShiftId;
      };

      const eligibleFor = (
        rule: ShiftLeaderRule,
        coverShiftId: string,
        day: WorkingDay
      ): string[] =>
        rule.leaderStaffIds.filter(
          (id) =>
            result.isUndecided(id, day) &&
            isAvailable(id, coverShiftId, day) &&
            ctx.preferenceOf(id, day).kind !== "day-off" &&
            !wouldExceedConsecutive(result, id, day, max)
        );

      // candidateId が、currentRule 以外の宣言済みルールでも「一意に（or ほぼ一意に）必要」か。
      // そうなら currentRule の枠ではこの人を消費せず、他の候補に譲る。
      const isCriticalElsewhere = (
        candidateId: string,
        day: WorkingDay,
        currentRule: ShiftLeaderRule
      ): boolean => {
        for (const other of allRules) {
          if (other.key === currentRule.key) continue;
          if (!other.leaderStaffIds.includes(candidateId)) continue;
          const otherCoverShiftId = resolveCoverShiftId(other);
          if (!otherCoverShiftId) continue;
          const otherRemainingNeed =
            other.minCount - other.countOnShift(result, day, [otherCoverShiftId]);
          if (otherRemainingNeed <= 0) continue; // 既に充足済み＝この人は不要
          const otherEligible = eligibleFor(other, otherCoverShiftId, day);
          if (otherEligible.length <= otherRemainingNeed) return true; // hidden set 相当
        }
        return false;
      };

      schedule.workingDays().forEach((day) => {
        for (const rule of rules) {
          const coverShiftId = resolveCoverShiftId(rule);
          if (!coverShiftId) continue;
          const coverShiftIds = new Set([coverShiftId]);

          while (!rule.isSatisfiedOn(result, day, coverShiftIds)) {
            const remainingNeed = rule.minCount - rule.countOnShift(result, day, coverShiftIds);
            const eligible = eligibleFor(rule, coverShiftId, day);
            if (eligible.length === 0) break; // これ以上埋められない（変更なし）

            const nonCritical = eligible.filter(
              (id) => !isCriticalElsewhere(id, day, rule)
            );

            if (nonCritical.length > 0 && nonCritical.length <= remainingNeed) {
              // hidden set: 除外後の候補が必要人数以下＝全員が確定して良い
              for (const id of nonCritical) {
                result = result.assignShift(id, day, coverShiftId);
                assigned++;
              }
              continue;
            }

            // 0件（残り全員が他ルールで必要）または人数超過（本当に選択の余地がある）
            ambiguousLeaderSlots.push({
              day,
              ruleKey: rule.key,
              shiftId: coverShiftId,
              remainingNeed,
              candidates: nonCritical,
              fallbackCandidates: eligible,
            });
            break;
          }
        }
      });

      return {
        schedule: result,
        assigned,
        message: `責任者制約を満たすため ${assigned}件を確定しました${
          ambiguousLeaderSlots.length > 0
            ? `（${ambiguousLeaderSlots.length}枠は他ルールとの兼ね合いで未定のまま残しました）`
            : ""
        }。`,
        ambiguousLeaderSlots,
      };
    },
  };
}
