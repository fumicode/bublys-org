/**
 * makePartnerCoverStep — 自動シフトのステップ「相方裏」
 *
 * 「2人のうち1人は必ず <coverShift> に入る」責任者ペア（例: 早責＝早番）向けのコマンド。
 * 一方が休みの日に、もう一方（未定・その帯に入れる）を coverShift に入れて穴を埋める。
 *
 * 「休みのときだけ」動く：ペアの誰も休んでいない日は触らない（人間の裁量に任せる）。
 * 既に誰かがその帯に入っている日も触らない。
 *
 * 対象スタッフ（ctx.staffIds）＝責任者グループ（抽出ビューで絞った2人など）。
 * coverShift は名前で受け取り、ctx.shiftIdByName でこの勤務表の実体IDへ解決する。
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

export function makePartnerCoverStep(coverShiftName: string): AutoShiftStep {
  return {
    key: `partner-cover:${coverShiftName}`,
    label: "相方裏",
    description: `責任者ペアの一方が休みの日に、もう一方を${coverShiftName}に入れて穴を埋めます（両方出られる日は触りません）。`,

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const coverShiftId = ctx.shiftIdByName.get(coverShiftName);
      if (!coverShiftId || !schedule.hasWorkShift(coverShiftId)) {
        return {
          schedule,
          assigned: 0,
          message: `${coverShiftName} が見つからないため何もしませんでした。`,
        };
      }

      const isAvailable = ctx.isAvailable ?? (() => true);
      const max = ctx.maxConsecutive ?? 5;
      const group = ctx.staffIds;
      let result = schedule;
      let assigned = 0;

      for (const day of schedule.workingDays()) {
        // ペアの誰かが休みの日だけ動く（「休みのときだけ裏を埋める」）
        const someoneOff = group.some((id) => result.isDayOff(id, day));
        if (!someoneOff) continue;
        // 既に誰かが裏（coverShift）に入っていれば充足済み
        const alreadyCovered = group.some(
          (id) => result.getShiftIdFor(id, day) === coverShiftId
        );
        if (alreadyCovered) continue;

        // 未定・その帯に入れる・休み希望でない・連勤上限を超えない相方を1人埋める
        const partner = group.find(
          (id) =>
            result.isUndecided(id, day) &&
            isAvailable(id, coverShiftId) &&
            ctx.preferenceOf(id, day).kind !== "day-off" &&
            !wouldExceedConsecutive(result, id, day, max)
        );
        if (partner) {
          result = result.assignShift(partner, day, coverShiftId);
          assigned++;
        }
      }

      return {
        schedule: result,
        assigned,
        message: `相方の休みに合わせて ${assigned}件を${coverShiftName}に入れました。`,
      };
    },
  };
}
