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
 *
 * **希望より勤務表の制約を優先する。** 希望どおりに置くと新しい違反が出る（遅番の翌日に
 * 早番を希望している、など）ときは入れずに未定のまま残し、件数を結果メッセージで知らせる。
 * 完成案は「制約を満たす案」なので、最初の段で違反を持ち込まない。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { canPlace } from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export const fulfillWishesStep: AutoShiftStep = {
  key: "fulfill-wishes",
  label: "希望を叶える",
  description:
    "スタッフの希望（休みたい・この帯がいい）を、空いているセルに反映します。曖昧な希望や人間が入力済みのセル、勤務表の制約に反する希望は入れません。",

  run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
    let result = schedule;
    let assigned = 0;
    let blocked = 0; // 制約に反するため入れなかった希望

    for (const day of schedule.workingDays()) {
      for (const staffId of ctx.staffIds) {
        if (!result.isUndecided(staffId, day)) continue; // 人間入力は守る
        const pref = ctx.preferenceOf(staffId, day);
        if (pref.kind === "day-off") {
          if (!canPlace(ctx, result, staffId, day, { kind: "day-off" })) {
            blocked++;
            continue;
          }
          result = result.assignDayOff(staffId, day);
          assigned++;
        } else if (pref.kind === "work") {
          // この勤務表が使う帯でなければ人間へ（希望の読み違いであって、制約の話ではない）
          if (!ctx.shiftNameById.has(pref.shiftId)) continue;
          const cell = { kind: "work", shiftId: pref.shiftId } as const;
          // 可能勤務帯でない帯は、これまでどおり黙って人間へ回す（制約違反の件数には数えない）
          if (ctx.isAvailable && !ctx.isAvailable(staffId, pref.shiftId, day)) continue;
          if (!canPlace(ctx, result, staffId, day, cell)) {
            blocked++;
            continue;
          }
          result = result.assignShift(staffId, day, pref.shiftId);
          assigned++;
        }
        // neutral / ambiguous は触らない
      }
    }

    return {
      schedule: result,
      assigned,
      message: `希望から ${assigned}件を確定しました${
        blocked > 0 ? `（勤務表の制約に反するため ${blocked}件の希望は入れずに残しました）` : ""
      }。`,
    };
  },
};
