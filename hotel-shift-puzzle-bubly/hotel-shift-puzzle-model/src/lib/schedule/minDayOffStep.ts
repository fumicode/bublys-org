/**
 * makeMinDayOffStep — 自動シフトのステップ「月◯日休む」
 *
 * 「スタッフは月に最低 minDayOff 日休まなければならない」制約を自動で満たすコマンド。
 * 各スタッフについて現在の休み日数を数え、足りない分だけ空き（未定）セルに休みを入れる。
 * 休みは月内になるべく散らして入れる（固まらないように）。
 *
 * 大原則は他ステップと同じ：
 *   - 人間が入力済みのセル（出勤・休み）は上書きしない（未定セルのみ触る）
 *   - 出勤したい希望（work 指定）の日は休みにしない（その日は避ける）
 *
 * 純粋・不変。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";

/** 候補 days から n 個を、なるべく等間隔に選ぶ（固まらないよう散らす）。 */
function pickSpread(days: WorkingDay[], n: number): WorkingDay[] {
  if (n >= days.length) return days;
  const picked: WorkingDay[] = [];
  for (let i = 0; i < n; i++) {
    picked.push(days[Math.floor(((i + 0.5) * days.length) / n)]);
  }
  return picked;
}

export function makeMinDayOffStep(minDayOff: number): AutoShiftStep {
  return {
    key: `min-day-off:${minDayOff}`,
    label: `月${minDayOff}日休む`,
    description: `各スタッフが月に最低${minDayOff}日休めるよう、足りない分だけ空きセルに休みを入れます（月内に散らして入れます／人間入力・出勤希望は尊重）。`,

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const days = schedule.workingDays();
      let result = schedule;
      let assigned = 0;

      for (const staffId of ctx.staffIds) {
        const need = minDayOff - result.countDayOffForStaff(staffId);
        if (need <= 0) continue;

        // 未定で、出勤希望でない日だけを休み候補にする（休み希望の日はむしろ歓迎）
        const eligible = days.filter(
          (d) =>
            result.isUndecided(staffId, d) &&
            ctx.preferenceOf(staffId, d).kind !== "work"
        );
        for (const day of pickSpread(eligible, need)) {
          result = result.assignDayOff(staffId, day);
          assigned++;
        }
      }

      return {
        schedule: result,
        assigned,
        message: `休みを ${assigned}件入れました（目標: 各自月${minDayOff}日）。`,
      };
    },
  };
}
