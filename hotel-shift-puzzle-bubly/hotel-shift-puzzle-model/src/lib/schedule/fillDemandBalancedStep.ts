/**
 * fillDemandBalancedStep — 自動シフトのステップ「必要人数を埋める（まんべんなく）」
 *
 * fillDemandStep（早番から順に詰める貪欲版）の代替戦略。前から詰めると人数不足のとき
 * 後ろの帯（遅番）が枯れてバランスが悪くなる。こちらは**全勤務帯の充足率が均等に
 * 近づくよう、最も足りていない帯へ1人ずつ配っていく**。
 *
 * 1人配るごとに「充足率（現在の人数 / 必要人数）が最も低い帯」を選び直す。これにより
 * 早番だけ満杯・遅番ゼロ、にならず不足が各帯へ散る。可能勤務帯の偏りも考慮し、配る人は
 * 「まだ足りない帯のうち入れる帯が少ない人（＝融通の利かない人）」を優先して充てることで、
 * 何でも入れる人を後の帯のために温存する。
 *
 * 実行の流れは早番から順に版と同じ3段:
 *   1. 休みの確保（ctx.minDayOff があれば先に各自の休みを置く）
 *   2. 需要を埋める（最も足りない帯へ1人ずつ＝まんべんなく）
 *   3. 空きを埋め切る（需要を満たしてもなお未定で残る人を、いま人数が一番少ない帯へ入れる）
 *      ＝完成した勤務表に「何も入っていないセル」を残さない（必要人数は超えうる）。
 *
 * 候補・制約・大原則は早番から順に版と同じ:
 *   - 候補は「希望なし(neutral) & 未定 & その帯に入れる & 連勤上限内」のスタッフ
 *   - 休み希望など希望のある人は触らない／人間入力済みのセルは触らない
 *   - 候補が足りなければ入れられるだけ入れる（需要は満たしきれないことがある）
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { wouldExceedConsecutive, countWorkingByName } from "./autoShiftStep.js";
import { placeMinDayOffs } from "./minDayOffStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export const fillDemandBalancedStep: AutoShiftStep = {
  key: "fill-demand-balanced",
  label: "必要人数を埋める（まんべんなく）",
  group: "fill-demand",
  groupLabel: "必要人数を埋める",
  variantLabel: "まんべんなく",
  description:
    "先に各スタッフの休み（月◯日）を確保し、必要人数に足りない勤務帯へ、全帯の充足率が均等になるよう最も足りない帯から1人ずつ配ります。需要を満たしたあとに残る空きセルも、いま人数が一番少ない帯へ入れて埋め切ります（未定を残さない）。早番だけ満杯で遅番ゼロ、になりにくい。休み希望の人は入れず、人間入力済みのセルも触りません。",

  run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
    const max = ctx.maxConsecutive ?? 5;
    const isAvailable = ctx.isAvailable ?? (() => true);
    let result = schedule;
    let assigned = 0;

    // 需要で埋め切ると空きセルが無くなって月◯日休めなくなるので、先に休みを確保しておく。
    let dayOffAssigned = 0;
    if (ctx.minDayOff !== undefined && ctx.minDayOff > 0) {
      const placed = placeMinDayOffs(result, ctx, ctx.minDayOff, {
        maxPerDay: ctx.maxDayOffPerDay,
      });
      result = placed.schedule;
      dayOffAssigned = placed.assigned;
    }

    for (const day of schedule.workingDays()) {
      // その日の候補プール（希望なし & 未定）。割り当てるたびに減らす
      const pool = ctx.staffIds.filter(
        (s) => result.isUndecided(s, day) && ctx.preferenceOf(s, day).kind === "neutral"
      );
      if (pool.length === 0) continue;

      // その人がその帯に「いま」入れるか（可能勤務帯 & 連勤上限）
      const canTake = (staffId: string, shiftId: string): boolean =>
        isAvailable(staffId, shiftId, day) && !wouldExceedConsecutive(result, staffId, day, max);

      // 1人ずつ、最も充足率の低い帯へ配る
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const counts = countWorkingByName(result, day, ctx.shiftNameById);

        // まだ不足していて、入れられる候補がいる帯を集める
        const needyShifts: { name: string; shiftId: string; ratio: number; remaining: number }[] = [];
        for (const [name, shiftId] of ctx.shiftIdByName) {
          const required = result.requiredFor(day, name);
          if (required <= 0) continue;
          const current = counts.get(name) ?? 0;
          const remaining = required - current;
          if (remaining <= 0) continue;
          if (!pool.some((s) => canTake(s, shiftId))) continue; // 埋められる人がいない帯は除く
          needyShifts.push({ name, shiftId, ratio: current / required, remaining });
        }
        if (needyShifts.length === 0) break;

        // 充足率が最も低い帯を選ぶ（同率なら不足人数が多い方 → 並び順）
        needyShifts.sort((a, b) => b.remaining - a.remaining);
        const target = needyShifts.reduce((best, s) => (s.ratio < best.ratio ? s : best));

        // その帯に入れる候補のうち、「まだ足りない帯」で入れる帯数が最も少ない人を充てる
        // （融通の利かない人を先に使い、何でも入れる人を他の帯のために温存する）
        const flexibilityOf = (staffId: string): number =>
          needyShifts.filter((s) => canTake(staffId, s.shiftId)).length;
        const candidates = pool.filter((s) => canTake(s, target.shiftId));
        const pick = candidates.reduce((best, s) =>
          flexibilityOf(s) < flexibilityOf(best) ? s : best
        );

        result = result.assignShift(pick, day, target.shiftId);
        assigned++;
        pool.splice(pool.indexOf(pick), 1);
      }
    }

    // 需要を満たしてもなお未定のまま残るセル（＝その日の必要人数を超えるぶんの人）を埋める。
    // まんべんなく版なので、その人が入れる帯のうち「いま人数が一番少ない帯」へ入れる。
    let extra = 0;
    for (const day of schedule.workingDays()) {
      for (const s of ctx.staffIds) {
        if (!result.isUndecided(s, day)) continue;
        if (ctx.preferenceOf(s, day).kind !== "neutral") continue; // 希望のある人は触らない
        if (wouldExceedConsecutive(result, s, day, max)) continue; // 連勤上限は守る

        const counts = countWorkingByName(result, day, ctx.shiftNameById);
        let best: { shiftId: string; n: number } | null = null;
        for (const [name, shiftId] of ctx.shiftIdByName) {
          if (!isAvailable(s, shiftId, day)) continue;
          const n = counts.get(name) ?? 0;
          if (!best || n < best.n) best = { shiftId, n };
        }
        if (!best) continue; // 入れる帯が無い人は未定のまま

        result = result.assignShift(s, day, best.shiftId);
        extra++;
      }
    }

    const parts: string[] = [];
    if (dayOffAssigned > 0) {
      parts.push(`休みを ${dayOffAssigned}件（各自月${ctx.minDayOff}日）先に確保`);
    }
    parts.push(`需要から ${assigned}件を確定`);
    if (extra > 0) parts.push(`残りの空きを ${extra}件 埋めました（まんべんなく）`);

    return {
      schedule: result,
      assigned: assigned + dayOffAssigned + extra,
      message: `${parts.join("し、")}。`,
    };
  },
};
