/**
 * fulfillWishesStep — 自動シフトのステップ「希望を叶える」
 *
 * スタッフの希望を、空いているセル（未定）に反映する。本人の希望に原則沿う最初の段階。
 *   - 休みたい                  → 休みに確定
 *   - 入れる帯が1つに決まる      → その勤務帯に確定（可能勤務帯のときのみ）
 *   - それ以外（帯が絞り切れない・入れる帯が無い）→ 触らない（人間 or 後続ステップへ）
 *
 * 希望キーの解釈（どの帯に入れるか）は上位層が DecodedWish に畳んで渡す。
 *
 * 人間入力済みのセルは触らない（未定セルのみ）。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export const fulfillWishesStep: AutoShiftStep = {
  key: "fulfill-wishes",
  label: "希望を叶える",
  description:
    "スタッフの希望（休みたい・この帯がいい）を、空いているセルに反映します。曖昧な希望や人間が入力済みのセルは触りません。",

  run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
    const isAvailable = ctx.isAvailable ?? (() => true);
    let result = schedule;
    let assigned = 0;

    for (const day of schedule.workingDays()) {
      for (const staffId of ctx.staffIds) {
        if (!result.isUndecided(staffId, day)) continue; // 人間入力は守る
        const pref = ctx.preferenceOf(staffId, day);
        if (pref.kind === "day-off") {
          result = result.assignDayOff(staffId, day);
          assigned++;
        } else if (pref.kind === "work") {
          // 可能勤務帯で、この勤務表が使う帯のときだけ転記する（でなければ人間へ）
          if (isAvailable(staffId, pref.shiftId, day) && ctx.shiftNameById.has(pref.shiftId)) {
            result = result.assignShift(staffId, day, pref.shiftId);
            assigned++;
          }
        }
        // neutral / ambiguous は触らない
      }
    }

    return {
      schedule: result,
      assigned,
      message: `希望から ${assigned}件を確定しました。`,
    };
  },
};
