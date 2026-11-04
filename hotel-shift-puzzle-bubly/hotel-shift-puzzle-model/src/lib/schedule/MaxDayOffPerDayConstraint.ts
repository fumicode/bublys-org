/**
 * MaxDayOffPerDayConstraint — 1日に休んでよい人数の上限制約
 *
 * 「同じ日に休めるのは最大 N 人まで」という制約。上限を超えた稼働日ごとに違反を1件返す。
 * スタッフではなくその日（列）の話なので、違反は日単位（staffId なし）で表す。
 *
 * 段階（#229。上限 N からの相対）: 上限ちょうど（守っている）／1人超え（違反）／2人以上超え（違反）。
 * 日ごとに測って段階に振り分け、check() も同じ振り分けから導く。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkingDay } from "./WorkingDay.js";
import { TightnessUnit, countByUnit, type TightnessAmount } from "./Tightness.js";

export const MAX_DAY_OFF_PER_DAY_CONSTRAINT = "max-day-off-per-day";

export const DAY_OFF_AT_LIMIT = new TightnessUnit({
  key: "day-off-at-limit",
  label: "休みが上限ちょうど",
  violating: false,
});
export const DAY_OFF_OVER_1 = new TightnessUnit({
  key: "day-off-over-1",
  label: "休みが上限を1人超え",
  violating: true,
});
export const DAY_OFF_OVER_2_PLUS = new TightnessUnit({
  key: "day-off-over-2-plus",
  label: "休みが上限を2人以上超え",
  violating: true,
});

/** その日の休みの人数の、上限からの距離 → 段階。上限より少なければ数えない */
export const dayOffTightnessOf = (distance: number): TightnessUnit | undefined =>
  distance < 0
    ? undefined
    : distance === 0
      ? DAY_OFF_AT_LIMIT
      : distance === 1
        ? DAY_OFF_OVER_1
        : DAY_OFF_OVER_2_PLUS;

/** 測った1件＝1日の休みの人数 */
type DayOff = { day: WorkingDay; count: number };

export class MaxDayOffPerDayConstraint implements ScheduleConstraint {
  readonly type = MAX_DAY_OFF_PER_DAY_CONSTRAINT;
  readonly label = "休み上限";
  /** 対象日の全スタッフの休み人数だけを見る（他日には影響しない） */
  readonly scope = "day" as const;

  readonly tightnessUnits = [DAY_OFF_AT_LIMIT, DAY_OFF_OVER_1, DAY_OFF_OVER_2_PLUS] as const;

  /** @param maxPerDay 1日に休んでよい人数の上限（既定 8） */
  constructor(readonly maxPerDay = 8) {}

  describe(): string {
    return `1日に休めるのは${this.maxPerDay}人まで`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    return this.measure(schedule)
      .filter((m) => this.unitOf(m)?.isViolating)
      .map(
        ({ day, count }) =>
          new ConstraintViolation({
            constraintType: this.type,
            staffId: undefined, // 日単位（その日に休みが多すぎる）
            days: [day],
            message: `休みが${count}人（上限${this.maxPerDay}人）`,
          })
      );
  }

  tightness(schedule: MonthlyStaffSchedule): TightnessAmount[] {
    return countByUnit(this.tightnessUnits, this.measure(schedule), (m) => this.unitOf(m));
  }

  private unitOf(m: DayOff): TightnessUnit | undefined {
    return dayOffTightnessOf(m.count - this.maxPerDay);
  }

  private measure(schedule: MonthlyStaffSchedule): DayOff[] {
    return schedule.workingDays().map((day) => ({ day, count: schedule.countDayOffOn(day) }));
  }
}
