/**
 * fillDemandStep — 自動シフトのステップ「必要人数を埋める（早番から順に）」
 *
 * 必要人数（需要）に足りていない勤務帯へ、とりあえずスタッフを入れてみる段階。
 * 「希望を叶える」の次に実行する想定。これは**勤務帯の並び順（早番→中番→遅番）に
 * 前から詰める貪欲版**。手前の帯から先に埋まるので、人数が足りないときは後ろの帯
 * （遅番）が枯れやすい。均等に配りたいときは fillDemandBalancedStep を使う。
 *
 * 割り当ての候補は、その日「希望なし(neutral)」かつ「未定」かつ「その帯に入れる」かつ
 * 「連勤上限を超えない」スタッフ。需要の不足分だけ、勤務帯ごとに貪欲に割り当てる。
 *   - 候補が足りなければ、入れられるだけ入れて残りは未定のまま（人間が調整）
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
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export const fillDemandStep: AutoShiftStep = {
  key: "fill-demand-ordered",
  label: "必要人数を埋める（早番から順に）",
  group: "fill-demand",
  groupLabel: "必要人数を埋める",
  variantLabel: "早番から順に",
  description:
    "必要人数に足りない勤務帯へ、勤務帯の並び順（早番→中番→遅番）に前から詰めます。人数が足りないと後ろの帯（遅番）が枯れやすい。休み希望の人は入れず、人間入力済みのセルも触りません。",

  run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
    const max = ctx.maxConsecutive ?? 5;
    const isAvailable = ctx.isAvailable ?? (() => true);
    let result = schedule;
    let assigned = 0;

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
          if (!isAvailable(s, shiftId)) continue;
          if (wouldExceedConsecutive(result, s, day, max)) continue;
          result = result.assignShift(s, day, shiftId);
          assigned++;
          pool.splice(pool.indexOf(s), 1);
          remaining--;
        }
      }
    }

    return {
      schedule: result,
      assigned,
      message: `需要から ${assigned}件を確定しました。`,
    };
  },
};
