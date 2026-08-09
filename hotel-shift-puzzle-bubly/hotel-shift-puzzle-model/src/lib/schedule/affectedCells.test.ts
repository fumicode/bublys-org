import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import { affectedCells } from "./affectedCells.js";

describe("affectedCells", () => {
  const schedule = MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6, // 30日
  });
  const changed = { staffId: "s1", day: WorkingDay.of(2026, 6, 10) };
  const staffIds = ["s1", "s2", "s3"];

  const keysOf = (cells: { staffId: string; day: WorkingDay }[]) =>
    new Set(cells.map((c) => `${c.staffId}:${c.day.key}`));

  it("'staff' scope: 同じスタッフの全日を返し、他スタッフは含まない", () => {
    const constraints: ScheduleConstraint[] = [new MaxConsecutiveWorkdaysConstraint(5)];
    const result = affectedCells(changed, constraints, schedule, staffIds);
    const keys = keysOf(result);

    expect(result.length).toBe(schedule.workingDays().length);
    for (const day of schedule.workingDays()) {
      expect(keys.has(`s1:${day.key}`)).toBe(true);
    }
    expect(keys.has(`s2:${changed.day.key}`)).toBe(false);
  });

  it("'day' scope: 同じ日の全スタッフを返し、他の日は含まない", () => {
    const constraints: ScheduleConstraint[] = [new MaxDayOffPerDayConstraint(8)];
    const result = affectedCells(changed, constraints, schedule, staffIds);
    const keys = keysOf(result);

    expect(result.length).toBe(staffIds.length);
    for (const staffId of staffIds) {
      expect(keys.has(`${staffId}:${changed.day.key}`)).toBe(true);
    }
    expect(keys.has(`s1:${WorkingDay.of(2026, 6, 11).key}`)).toBe(false);
  });

  it("scope宣言が無い制約（既定 global）は盤面全体を返す", () => {
    const constraints: ScheduleConstraint[] = [
      { type: "custom", label: "未検証", describe: () => "", check: () => [] },
    ];
    const result = affectedCells(changed, constraints, schedule, staffIds);
    expect(result.length).toBe(staffIds.length * schedule.workingDays().length);
  });

  it("'staff' と 'day' が両方あれば和集合になる（重複は1件に畳む）", () => {
    const constraints: ScheduleConstraint[] = [
      new MaxConsecutiveWorkdaysConstraint(5),
      new MaxDayOffPerDayConstraint(8),
    ];
    const result = affectedCells(changed, constraints, schedule, staffIds);
    const keys = keysOf(result);

    expect(keys.size).toBe(result.length); // 重複無し
    expect(keys.has(`s2:${changed.day.key}`)).toBe(true); // day scope 由来
    expect(keys.has(`s1:${WorkingDay.of(2026, 6, 1).key}`)).toBe(true); // staff scope 由来
    expect(keys.has(`s2:${WorkingDay.of(2026, 6, 1).key}`)).toBe(false); // どちらにも該当しない
  });

  it("制約が空でも、変更セル自身は含む", () => {
    const result = affectedCells(changed, [], schedule, staffIds);
    expect(keysOf(result).has(`s1:${changed.day.key}`)).toBe(true);
  });
});
