/**
 * PlacementCount — 置いたセルの数（少ないほど良い。#229）
 *
 * 制約ではなく探索の目的の1つ。違反は出さない（check() は常に空）。
 * ルール: **レシピの何にも効かない手は打たない。** レシピの一番下に任意で置くと、
 * 上の単位がすべて同じ盤面どうしでは「置いていないほうが良い」になり、
 * 何にも効かないセルは未定へ戻る（責任者のために置いた早番は、上の単位が良くなるので残る）。
 * 置いた＝未定でないセル（出勤・休み）。測る人だけを数える。
 */
import type { MonthlyStaffSchedule } from "../MonthlyStaffSchedule.js";
import type { ConstraintViolation } from "../ConstraintViolation.js";
import type { ScheduleConstraint } from "../ScheduleConstraint.js";
import { TightnessAmount, TightnessUnit } from "../Tightness.js";

export const PLACEMENT_COUNT = "placement-count";

export const PLACED_CELLS = new TightnessUnit({
  key: "placed-cells",
  label: "置いたセル（件）",
  violating: false,
  defaultWeight: { hard: false, priority: 0 },
});

export class PlacementCount implements ScheduleConstraint {
  readonly type = PLACEMENT_COUNT;
  readonly label = "置いた数";
  readonly scope = "staff" as const;
  readonly tightnessUnits = [PLACED_CELLS] as const;

  constructor(readonly staffIds: readonly string[]) {}

  describe(): string {
    return "置くセルはなるべく少なく";
  }

  check(): ConstraintViolation[] {
    return [];
  }

  tightness(schedule: MonthlyStaffSchedule): TightnessAmount[] {
    let placed = 0;
    for (const day of schedule.workingDays()) {
      for (const id of this.staffIds) if (!schedule.isUndecided(id, day)) placed++;
    }
    return [new TightnessAmount({ amount: placed, unit: PLACED_CELLS })];
  }
}
