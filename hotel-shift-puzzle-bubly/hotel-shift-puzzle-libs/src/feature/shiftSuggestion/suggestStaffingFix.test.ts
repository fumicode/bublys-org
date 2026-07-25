import {
  MonthlyStaffSchedule,
  Staff,
  WorkShift,
  WorkingDay,
  MinMonthlyDayOffConstraint,
} from "@bublys-org/hotel-shift-puzzle-model";
import { suggestStaffingFix } from "./suggestStaffingFix.js";

describe("suggestStaffingFix", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const s1 = new Staff({ id: "s1", name: "田中" });
  const s2 = new Staff({ id: "s2", name: "鈴木" });

  it("休みの人を勤務帯へ動かして人数不足を埋められる", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day = WorkingDay.of(2026, 6, 27);
    // s1 は早番、s2 はその日休み（未定でも良いが、休みで確定していても候補にできることを確認）
    schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "early" });
    schedule = schedule.setCell("s2", day, { kind: "day-off" });

    const result = suggestStaffingFix({
      schedule,
      day,
      shiftId: "early",
      constraints: [],
      staffList: [s1, s2],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).not.toBeNull();
    expect(result?.staffId).toBe("s2");
    expect(result?.cell).toEqual({ kind: "work", shiftId: "early" });
    expect(result?.violationsAfter).toBe(0);
  });

  it("既にその勤務帯に入っている人は候補にしない", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day = WorkingDay.of(2026, 6, 27);
    schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "early" });
    schedule = schedule.setCell("s2", day, { kind: "work", shiftId: "early" });

    const result = suggestStaffingFix({
      schedule,
      day,
      shiftId: "early",
      constraints: [],
      staffList: [s1, s2],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).toBeNull();
  });

  it("動かすと他の制約が悪化する人は候補から外す", () => {
    // s2 はこの月ずっと出勤で、27日だけ休み（最低休日数1に対してギリギリ1日）。
    // 27日を早番に変えると休み0日になり最低休日数に違反するので、候補から外れるべき。
    // s1 は既に早番なので候補外。→ 埋められる人がおらず null になる。
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day = WorkingDay.of(2026, 6, 27);
    // s1 は別日に休みを1日確保済み（最低休日数1を満たす）。27日は早番。
    schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, 1), { kind: "day-off" });
    schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "early" });
    for (const d of schedule.workingDays()) {
      schedule = schedule.setCell("s2", d, { kind: "work", shiftId: "early" });
    }
    schedule = schedule.setCell("s2", day, { kind: "day-off" });

    const constraints = [new MinMonthlyDayOffConstraint(1)];
    expect(schedule.checkConstraints(constraints).length).toBe(0); // 今は両者とも満たしている

    const result = suggestStaffingFix({
      schedule,
      day,
      shiftId: "early",
      constraints,
      staffList: [s1, s2],
      workShifts: [early],
      wishByStaff: new Map(),
    });

    expect(result).toBeNull();
  });

  it("動かした先で新たに不足が出ても、もう一手で解消できるなら連鎖として採用する", () => {
    // 中番を埋められるのは s1 だけ（s2 は遅番専任）。s1 は今ちょうど遅番を1/1で満たしている。
    // s1 を中番へ動かすと遅番が0/1になるが、休みの s2 を遅番へ動かせば連鎖で解消する。
    const middle = WorkShift.of("middle", "中番", { hour: 11 });
    const late = WorkShift.of("late", "遅番", { hour: 15 });

    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day = WorkingDay.of(2026, 6, 27);
    schedule = schedule.setRequired(day, "中番", 1).setRequired(day, "遅番", 1);
    schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "late" });
    schedule = schedule.setCell("s2", day, { kind: "day-off" });

    const isAvailable = (staffId: string, shiftId: string) =>
      staffId === "s2" ? shiftId === "late" : true;

    const result = suggestStaffingFix({
      schedule,
      day,
      shiftId: "middle",
      constraints: [],
      staffList: [s1, s2],
      workShifts: [middle, late],
      wishByStaff: new Map(),
      isAvailable,
    });

    expect(result).not.toBeNull();
    expect(result?.staffId).toBe("s1");
    expect(result?.cell).toEqual({ kind: "work", shiftId: "middle" });
    expect(result?.followUpSteps).toEqual([
      { staffId: "s2", dayKey: day.key, shiftId: "late" },
    ]);
    expect(result?.violationsAfter).toBe(0);
    expect(result?.gapAfter).toBe(0);
  });

  it("連鎖しても解消できる人がいなければ提案しない（横流しで元に戻るだけの手は採用しない）", () => {
    const middle = WorkShift.of("middle", "中番", { hour: 11 });
    const late = WorkShift.of("late", "遅番", { hour: 15 });

    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day = WorkingDay.of(2026, 6, 27);
    schedule = schedule.setRequired(day, "中番", 1).setRequired(day, "遅番", 1);
    schedule = schedule.setCell("s1", day, { kind: "work", shiftId: "late" });

    const result = suggestStaffingFix({
      schedule,
      day,
      shiftId: "middle",
      constraints: [],
      staffList: [s1], // 遅番を肩代わりできる人がいない
      workShifts: [middle, late],
      wishByStaff: new Map(),
    });

    expect(result).toBeNull();
  });
});
