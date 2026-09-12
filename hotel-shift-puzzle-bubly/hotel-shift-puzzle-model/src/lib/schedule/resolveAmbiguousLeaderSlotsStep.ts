/**
 * makeResolveAmbiguousLeaderSlotsStep — makeSatisfyLeaderRulesStep が一意に決め切れず
 * 未定のまま残した責任者枠（AmbiguousLeaderSlot）を、phase 違いで確定させるステップ。
 *
 * makeSatisfyLeaderRulesStep は「他に選択肢がない」場合だけ確定するので、ここで受け取る
 * 枠は本当に複数の正解がありうる（or 取り合いになっている）もの。3案生成（世界線の
 * 兄弟ブランチ）で phase を変えて呼び分けることで、それぞれ違う人を選んだ案になる。
 *
 * 各 slot の候補は、その時点の勤務表に対して都度再フィルタする（キャッシュされた
 * candidates/fallbackCandidates をそのまま使わない）。同じ人を必要とする複数の slot が
 * 並んでいるとき、先に確定した slot でその人が使われれば、後続の slot の候補プールから
 * 自然に消えるようにするため。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
  AmbiguousLeaderSlot,
} from "./autoShiftStep.js";
import { wouldExceedConsecutive } from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export type ResolveAmbiguousLeaderSlotsOptions = {
  /** 候補の並び順をずらすオフセット（複数案の生成に使う。既定 0） */
  phase?: number;
};

export function makeResolveAmbiguousLeaderSlotsStep(
  slots: AmbiguousLeaderSlot[],
  opts: ResolveAmbiguousLeaderSlotsOptions = {}
): AutoShiftStep {
  const phase = opts.phase ?? 0;
  return {
    key: phase === 0 ? "resolve-ambiguous-leader-slots" : `resolve-ambiguous-leader-slots:p${phase}`,
    label: "残った責任者枠を決める",
    description:
      "責任者制約を満たすステップで一意に決め切れなかった枠を、phase違いで確定します（複数案の生成に使う）。",

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const isAvailable = ctx.isAvailable ?? (() => true);
      const max = ctx.maxConsecutive ?? 5;
      let result = schedule;
      let assigned = 0;

      const refilter = (ids: string[], slot: AmbiguousLeaderSlot): string[] =>
        ids.filter(
          (id) =>
            result.isUndecided(id, slot.day) &&
            isAvailable(id, slot.shiftId, slot.day) &&
            ctx.preferenceOf(id, slot.day).kind !== "day-off" &&
            !wouldExceedConsecutive(result, id, slot.day, max)
        );

      slots.forEach((slot, slotIndex) => {
        let pool = refilter(slot.candidates, slot);
        if (pool.length === 0) pool = refilter(slot.fallbackCandidates, slot);
        if (pool.length === 0) return; // 候補が尽きている。従来通り妥協として残る

        const start = ((slotIndex + phase) % pool.length + pool.length) % pool.length;
        const ordered = [...pool.slice(start), ...pool.slice(0, start)];

        let need = slot.remainingNeed;
        for (const id of ordered) {
          if (need <= 0) break;
          if (!result.isUndecided(id, slot.day)) continue; // 他の slot 解決で既に埋まった
          result = result.assignShift(id, slot.day, slot.shiftId);
          assigned++;
          need--;
        }
      });

      return {
        schedule: result,
        assigned,
        message: `残っていた責任者枠のうち ${assigned}件を確定しました。`,
      };
    },
  };
}
