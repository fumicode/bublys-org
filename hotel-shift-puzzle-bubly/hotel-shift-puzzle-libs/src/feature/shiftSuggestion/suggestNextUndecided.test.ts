import { MonthlyStaffSchedule, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import { suggestNextUndecided } from "./suggestNextUndecided.js";

const day = (n: number) => WorkingDay.of(2026, 6, n);

const emptyJune = () =>
  MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  });

describe("suggestNextUndecided", () => {
  it("未定が無ければ null", () => {
    let filled = emptyJune();
    for (const d of filled.workingDays()) {
      filled = filled.assignDayOff("s1", d).assignDayOff("s2", d);
    }
    expect(suggestNextUndecided(filled, ["s1", "s2"])).toBeNull();
  });

  it("先頭の未定セルを返す", () => {
    const schedule = emptyJune().assignDayOff("s1", day(1));
    const next = suggestNextUndecided(schedule, ["s1", "s2"]);
    expect(next?.staffId).toBe("s1");
    expect(next?.day.day).toBe(2);
  });

  it("after より後ろの未定セルを返す（先頭へは戻らない）", () => {
    const schedule = emptyJune()
      .assignDayOff("s1", day(1))
      .assignDayOff("s1", day(2));
    const next = suggestNextUndecided(schedule, ["s1", "s2"], {
      staffId: "s1",
      day: day(2),
    });
    expect(next?.staffId).toBe("s1");
    expect(next?.day.day).toBe(3);
  });

  it("after 以降に未定が無ければ null（回り込まない）", () => {
    let schedule = emptyJune();
    for (const d of schedule.workingDays()) {
      schedule = schedule.assignDayOff("s1", d);
    }
    const last = schedule.workingDays().at(-1)!;
    const next = suggestNextUndecided(schedule, ["s1"], {
      staffId: "s1",
      day: last,
    });
    expect(next).toBeNull();
  });
});
