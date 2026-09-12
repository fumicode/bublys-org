/**
 * fillDemandStep — 自動シフトのステップ「必要人数を埋める（早番から順に）」
 *
 * 必要人数（需要）に足りていない勤務帯へ、とりあえずスタッフを入れてみる段階。
 * 「希望を叶える」の次に実行する想定。これは**勤務帯の並び順（早番→中番→遅番）に
 * 前から詰める貪欲版**。手前の帯から先に埋まるので、人数が足りないときは後ろの帯
 * （遅番）が枯れやすい。均等に配りたいときは fillDemandBalancedStep を使う。
 *
 * 実行の流れ（3段）:
 *   1. 休みの確保 … ctx.minDayOff があれば、先に各自の休み（月◯日）を置く。先に需要で埋め切ると
 *      空きセルが無くなって休めなくなるため。
 *   2. 需要を埋める … 不足している勤務帯へ、勤務帯の並び順に貪欲に割り当てる。
 *   3. 空きを埋め切る … 需要を満たしてもなお未定で残る人（必要人数を超えるぶん）も、入れる勤務帯へ
 *      入れて埋める。＝完成した勤務表に「何も入っていないセル」を残さない（必要人数は超えうる）。
 *
 * 割り当ての候補は、その日「希望なし(neutral)」かつ「未定」かつ「その帯に入れる」かつ
 * 「連勤上限を超えない」スタッフ。
 *   - 候補が足りなければ、入れられるだけ入れる（需要は満たしきれないことがある）
 *   - 休み希望・特定帯希望など希望のある人は触らない（希望ステップに委ねる／人間へ）
 *   - 人間入力済みのセルは触らない
 *
 * ※このステップは「とりあえず埋める」ため、誰を出すかの選択は機械が決める。
 *   不満があれば世界線で巻き戻せるし、人間がセルを直せる。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { wouldExceedConsecutive, countWorkingByName } from "./autoShiftStep.js";
import { placeMinDayOffs } from "./minDayOffStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export const fillDemandStep: AutoShiftStep = {
  key: "fill-demand-ordered",
  label: "必要人数を埋める（早番から順に）",
  group: "fill-demand",
  groupLabel: "必要人数を埋める",
  variantLabel: "早番から順に",
  description:
    "先に各スタッフの休み（月◯日）を確保し、必要人数に足りない勤務帯へ勤務帯の並び順（早番→中番→遅番）に前から詰めます。需要を満たしたあとに残る空きセルも、入れる勤務帯へ入れて埋め切ります（未定を残さない）。人数が足りないと後ろの帯（遅番）が枯れやすい。休み希望の人は入れず、人間入力済みのセルも触りません。",

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

      for (const [name, shiftId] of ctx.shiftIdByName) {
        const current = countWorkingByName(result, day, ctx.shiftNameById).get(name) ?? 0;
        let remaining = result.requiredFor(day, name) - current;
        if (remaining <= 0) continue;

        // 不足分だけ、入れられる候補を貪欲に割り当てる
        for (const s of [...pool]) {
          if (remaining <= 0) break;
          if (!isAvailable(s, shiftId, day)) continue;
          if (wouldExceedConsecutive(result, s, day, max)) continue;
          result = result.assignShift(s, day, shiftId);
          assigned++;
          pool.splice(pool.indexOf(s), 1);
          remaining--;
        }
      }
    }

    // 需要を満たしてもなお未定のまま残るセル（＝その日の必要人数を超えるぶんの人）を、
    // 入れる勤務帯のうち先頭のものへ入れて埋める。「何も入っていない日」を残さない。
    let extra = 0;
    for (const day of schedule.workingDays()) {
      for (const s of ctx.staffIds) {
        if (!result.isUndecided(s, day)) continue;
        if (ctx.preferenceOf(s, day).kind !== "neutral") continue; // 希望のある人は触らない
        if (wouldExceedConsecutive(result, s, day, max)) continue; // 連勤上限は守る
        for (const [, shiftId] of ctx.shiftIdByName) {
          if (!isAvailable(s, shiftId, day)) continue;
          result = result.assignShift(s, day, shiftId);
          extra++;
          break;
        }
      }
    }

    const parts: string[] = [];
    if (dayOffAssigned > 0) {
      parts.push(`休みを ${dayOffAssigned}件（各自月${ctx.minDayOff}日）先に確保`);
    }
    parts.push(`需要から ${assigned}件を確定`);
    if (extra > 0) parts.push(`残りの空きを ${extra}件 埋めました`);

    return {
      schedule: result,
      assigned: assigned + dayOffAssigned + extra,
      message: `${parts.join("し、")}。`,
    };
  },
};
