/**
 * makePartnerCoverStep — 自動シフトのステップ「相方裏」
 *
 * 宣言的ルール `ShiftLeaderRule`（「責任者集合のうち最低 minCount 人が担当勤務帯に入る」）
 * に **基づいて** 実装する。表示（footer の ◯/✕）と同じルールから導出されるのが肝。
 *
 * 戦略（このコマンドの方針）:
 *   - ペアの一方が休みの日「だけ」動く（両方出られる日は人間の裁量に任せる）。
 *   - その日ルールが未充足なら、未定で担当勤務帯に入れる責任者を、充足するまで埋める。
 *
 * 対象は `rule.leaderStaffIds`（＝責任者の人。抽出した subset = ctx.staffIds ではない）。
 * カバー勤務帯は `rule.shiftName` を ctx.shiftIdByName でこの勤務表の実体IDへ解決する。
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

export function makePartnerCoverStep(rule: ShiftLeaderRule): AutoShiftStep {
  return {
    key: `partner-cover:${rule.key}`,
    label: "相方裏",
    description: `${rule.label}ペアの一方が休みの日に、もう一方を${rule.shiftName}に入れて穴を埋めます（両方出られる日は触りません）。`,

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const coverShiftId = ctx.shiftIdByName.get(rule.shiftName);
      if (!coverShiftId || !schedule.hasWorkShift(coverShiftId)) {
        return {
          schedule,
          assigned: 0,
          message: `${rule.shiftName} が見つからないため何もしませんでした。`,
        };
      }

      const coverShiftIds = new Set([coverShiftId]);
      const isAvailable = ctx.isAvailable ?? (() => true);
      const max = ctx.maxConsecutive ?? 5;
      const group = rule.leaderStaffIds; // ルールが宣言する責任者集合
      let result = schedule;
      let assigned = 0;

      for (const day of schedule.workingDays()) {
        // ペアの誰かが休みの日だけ動く（「休みのときだけ裏を埋める」）
        const someoneOff = group.some((id) => result.isDayOff(id, day));
        if (!someoneOff) continue;

        // 充足するまで（minCount 人埋まるまで／候補が尽きるまで）相方を入れる
        while (!rule.isSatisfiedOn(result, day, coverShiftIds)) {
          // 未定・その帯に入れる・休み希望でない・連勤上限を超えない相方を1人
          const partner = group.find(
            (id) =>
              result.isUndecided(id, day) &&
              isAvailable(id, coverShiftId) &&
              ctx.preferenceOf(id, day).kind !== "day-off" &&
              !wouldExceedConsecutive(result, id, day, max)
          );
          if (!partner) break; // これ以上埋められない
          result = result.assignShift(partner, day, coverShiftId);
          assigned++;
        }
      }

      return {
        schedule: result,
        assigned,
        message: `相方の休みに合わせて ${assigned}件を${rule.shiftName}に入れました。`,
      };
    },
  };
}
