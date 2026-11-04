/**
 * MaxConsecutiveWorkdaysConstraint — 連勤上限制約
 *
 * 「あるスタッフが連続して出勤していいのは N 日まで」という制約。
 * N 日を超える連勤（= N+1 連勤以上）があれば、その連勤の塊全体を違反範囲とする
 * ConstraintViolation を1件返す。
 *
 * 連勤の定義:
 *   - 勤務表の稼働日（1日〜末日）を暦順にたどり、「出勤（いずれかの勤務帯）」が
 *     続いている区間を1つの連勤とみなす。
 *   - 休み・未定はいずれも連勤を区切る（出勤していない日でリセット）。
 *   - 前月とつないでいれば（{@link MonthlyStaffSchedule.precedingTail}）、前月末から続く出勤を
 *     今月1日からの連勤に足す。月末で働く人の暮らしは途切れないので、数え直さない。
 *     違反の範囲は今月側の日だけ（前月は確定済みで、ここからは直せない）。
 *     前月の中だけで終わった連勤は前月の話なので、今月には出さない。
 *
 * きつさ（#229。上限 N からの相対）: 上限ちょうど（件・守っている）／上限超え（超えた日数・違反）。
 * 連勤を1つずつ測り（上限からの距離）、単位に振り分ける。check() も同じ振り分けから導く
 * （違反の単位に入った連勤だけが違反で、違反の量は超えた日数）。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { WorkingDay } from "./WorkingDay.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import { TightnessUnit, sumByUnit, type Tally, type TightnessAmount } from "./Tightness.js";

export const MAX_CONSECUTIVE_WORKDAYS = "max-consecutive-workdays";

/** 連勤が上限ちょうど（守っているが、きつい）。件数で数える */
export const RUN_AT_LIMIT = new TightnessUnit({
  key: "run-at-limit",
  label: "連勤上限ちょうど（件）",
  violating: false,
});
/** 連勤が上限を超えた。超えた日数で数える */
export const RUN_OVER = new TightnessUnit({
  key: "run-over",
  label: "連勤の上限超え（日）",
  violating: true,
});

/** 連勤の上限からの距離（連勤の日数 - 上限）→ 量。上限より短い連勤は数えない */
export const runTallyOf = (distance: number): Tally | undefined =>
  distance < 0
    ? undefined
    : distance === 0
      ? { unit: RUN_AT_LIMIT, amount: 1 }
      : { unit: RUN_OVER, amount: distance };

/** 測った1件＝1つの連勤（今月側の日と、前月から持ち越した日数） */
type Run = { staffId: string; days: WorkingDay[]; carried: number };

export class MaxConsecutiveWorkdaysConstraint implements ScheduleConstraint {
  readonly type = MAX_CONSECUTIVE_WORKDAYS;
  readonly label = "連勤";
  /** 対象スタッフの日列だけを見る（他スタッフには影響しない） */
  readonly scope = "staff" as const;

  readonly tightnessUnits = [RUN_AT_LIMIT, RUN_OVER] as const;

  /** @param maxConsecutive 許容する連勤日数の上限（既定 5） */
  constructor(readonly maxConsecutive = 5) {}

  describe(): string {
    return `連勤は最大${this.maxConsecutive}日まで`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    return this.runs(schedule).flatMap((run) => {
      const tally = this.tallyOf(run);
      return tally?.unit.isViolating
        ? [this.toViolation(run.staffId, run.days, run.carried, tally.amount)]
        : [];
    });
  }

  tightness(schedule: MonthlyStaffSchedule): TightnessAmount[] {
    return sumByUnit(this.tightnessUnits, this.runs(schedule), (run) => this.tallyOf(run));
  }

  private tallyOf(run: Run): Tally | undefined {
    return runTallyOf(run.carried + run.days.length - this.maxConsecutive);
  }

  /** スタッフごとに、今月の日にかかる連勤をすべて測る（前月から続く分は carried に数える） */
  private runs(schedule: MonthlyStaffSchedule): Run[] {
    const runs: Run[] = [];
    const days = schedule.workingDays();
    const staffIds = [...new Set(schedule.assignments.map((a) => a.staffId))];
    const tail = schedule.precedingTail;

    for (const staffId of staffIds) {
      // 前月末から持ち越した連勤日数（今月1日が出勤のときだけ効く）
      let carried = tail?.trailingWorkdays(staffId) ?? 0;
      let current: WorkingDay[] = [];
      const flush = () => {
        if (current.length > 0) runs.push({ staffId, days: current, carried });
        current = [];
        carried = 0;
      };
      for (const day of days) {
        if (schedule.isWorking(staffId, day)) {
          current.push(day);
        } else {
          flush();
        }
      }
      flush();
    }
    return runs;
  }

  private toViolation(
    staffId: string,
    run: WorkingDay[],
    carried: number,
    amount: number
  ): ConstraintViolation {
    const total = carried + run.length;
    return new ConstraintViolation({
      constraintType: this.type,
      staffId,
      days: run,
      amount,
      message:
        carried > 0
          ? `前月から続いて${total}連勤（上限${this.maxConsecutive}連勤）`
          : `${total}連勤（上限${this.maxConsecutive}連勤）`,
      summary:
        carried > 0
          ? `前月から${total}連勤（上限${this.maxConsecutive}）`
          : `${total}連勤（上限${this.maxConsecutive}）`,
    });
  }
}
