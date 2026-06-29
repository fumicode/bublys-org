/**
 * makeMinDayOffStep — 自動シフトのステップ「月◯日休む」
 *
 * 「スタッフは月に最低 minDayOff 日休む」を満たすコマンド。各スタッフについて現在の休み日数を
 * 数え、足りない分だけ空き（未定）セルに休みを入れる。
 *
 * オプション:
 *   - maxPerDay : 1日に休んでよい人数の上限。これに達している日には休みを入れない（崩さない）。
 *   - phase     : 休みを入れ始める位置のズラし。スタッフごとにも (phase + 並び順) でずらすため、
 *                 制約（月最低・1日上限）を守った結果として自然に「斜め」の配置になりやすい。
 *                 phase を変えると別の有効解になるので、複数案（世界線）の生成に使う。
 *
 * 大原則は他ステップと同じ：
 *   - 人間が入力済みのセル（出勤・休み）は上書きしない（未定セルのみ触る）
 *   - 出勤したい希望（work 指定）の日は休みにしない
 *
 * 純粋・不変。乱数は使わず、phase で決定的に解を変える。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";

export type MinDayOffOptions = {
  /** 1日に休んでよい人数の上限（未指定なら無制限） */
  maxPerDay?: number;
  /** 休みを入れ始める位置のズラし（複数案の生成に使う。既定 0） */
  phase?: number;
};

/**
 * eligible（休みを入れられる候補日）を、start から始めて stride 間隔で散らした順に並べ替える。
 * 先頭ほど等間隔で離れた日になるので、先に必要数を取れば自然に散る。
 */
function spreadOrder<T>(items: T[], need: number, start: number): T[] {
  const m = items.length;
  if (m === 0) return [];
  const s = ((start % m) + m) % m;
  const rotated = [...items.slice(s), ...items.slice(0, s)];
  const stride = Math.max(1, Math.floor(m / Math.max(1, need)));
  const out: T[] = [];
  for (let offset = 0; offset < stride; offset++) {
    for (let j = offset; j < m; j += stride) out.push(rotated[j]);
  }
  return out;
}

export function makeMinDayOffStep(
  minDayOff: number,
  opts: MinDayOffOptions = {}
): AutoShiftStep {
  const { maxPerDay, phase = 0 } = opts;
  return {
    key: phase === 0 ? `min-day-off:${minDayOff}` : `min-day-off:${minDayOff}:p${phase}`,
    label: `月${minDayOff}日休む`,
    description: `各スタッフが月に最低${minDayOff}日休めるよう、足りない分だけ空きセルに休みを入れます${
      maxPerDay !== undefined ? `（1日${maxPerDay}人を超えない範囲で）` : ""
    }（人間入力・出勤希望は尊重）。`,

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const days = schedule.workingDays();
      let result = schedule;
      let assigned = 0;

      ctx.staffIds.forEach((staffId, i) => {
        const need = minDayOff - result.countDayOffForStaff(staffId);
        if (need <= 0) return;

        // 未定で、出勤希望でない日だけを休み候補にする（休み希望の日はむしろ歓迎）
        const eligible = days.filter(
          (d) =>
            result.isUndecided(staffId, d) &&
            ctx.preferenceOf(staffId, d).kind !== "work"
        );

        // スタッフごとに start をずらして（phase + 並び順）斜めに散らす
        const ordered = spreadOrder<WorkingDay>(eligible, need, phase + i);
        let placed = 0;
        for (const day of ordered) {
          if (placed >= need) break;
          if (maxPerDay !== undefined && result.countDayOffOn(day) >= maxPerDay) continue;
          result = result.assignDayOff(staffId, day);
          assigned++;
          placed++;
        }
      });

      return {
        schedule: result,
        assigned,
        message: `休みを ${assigned}件入れました（目標: 各自月${minDayOff}日${
          maxPerDay !== undefined ? ` / 1日${maxPerDay}人まで` : ""
        }）。`,
      };
    },
  };
}
