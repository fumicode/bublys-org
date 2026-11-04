/**
 * MaxDayOffPerDayConstraint — 1日に休んでよい人数の上限制約
 *
 * 「同じ日に休めるのは最大 N 人まで」という制約。上限を超えた稼働日ごとに違反を1件返す。
 * スタッフではなくその日（列）の話なので、違反は日単位（staffId なし）で表す。
 *
 * きつさ（#229。上限 N からの相対）: 上限ちょうど（日・守っている）／上限超え（超えた人数・違反）。
 * 日ごとに測って単位に振り分け、check() も同じ振り分けから導く（違反の量は超えた人数）。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkingDay } from "./WorkingDay.js";
import { TightnessUnit, sumByUnit, type Tally, type TightnessAmount } from "./Tightness.js";

export const MAX_DAY_OFF_PER_DAY_CONSTRAINT = "max-day-off-per-day";

export const DAY_OFF_AT_LIMIT = new TightnessUnit({
  key: "day-off-at-limit",
  label: "休みが上限ちょうど（日）",
  violating: false,
});
export const DAY_OFF_OVER = new TightnessUnit({
  key: "day-off-over",
  label: "休みの上限超え（人）",
  violating: true,
});

/** その日の休みの人数の、上限からの距離 → 量。上限より少なければ数えない */
export const dayOffTallyOf = (distance: number): Tally | undefined =>
  distance < 0
    ? undefined
    : distance === 0
      ? { unit: DAY_OFF_AT_LIMIT, amount: 1 }
      : { unit: DAY_OFF_OVER, amount: distance };

/** 測った1件＝1日の休みの人数 */
type DayOff = { day: WorkingDay; count: number };

export class MaxDayOffPerDayConstraint implements ScheduleConstraint {
  readonly type = MAX_DAY_OFF_PER_DAY_CONSTRAINT;
  readonly label = "休み上限";
  /** 対象日の全スタッフの休み人数だけを見る（他日には影響しない） */
  readonly scope = "day" as const;

  readonly tightnessUnits = [DAY_OFF_AT_LIMIT, DAY_OFF_OVER] as const;

  /** @param maxPerDay 1日に休んでよい人数の上限（既定 8） */
  constructor(readonly maxPerDay = 8) {}

  describe(): string {
    return `1日に休めるのは${this.maxPerDay}人まで`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    return this.measure(schedule).flatMap(({ day, count }) => {
      const tally = this.tallyOf({ day, count });
      return tally?.unit.isViolating
        ? [
            new ConstraintViolation({
              constraintType: this.type,
              staffId: undefined, // 日単位（その日に休みが多すぎる）
              days: [day],
              amount: tally.amount,
              message: `休みが${count}人（上限${this.maxPerDay}人）`,
            }),
          ]
        : [];
    });
  }

  tightness(schedule: MonthlyStaffSchedule): TightnessAmount[] {
    return sumByUnit(this.tightnessUnits, this.measure(schedule), (m) => this.tallyOf(m));
  }

  private tallyOf(m: DayOff): Tally | undefined {
    return dayOffTallyOf(m.count - this.maxPerDay);
  }

  private measure(schedule: MonthlyStaffSchedule): DayOff[] {
    return schedule.workingDays().map((day) => ({ day, count: schedule.countDayOffOn(day) }));
  }
}
