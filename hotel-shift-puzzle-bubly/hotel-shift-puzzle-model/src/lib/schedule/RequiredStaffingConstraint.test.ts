import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { RequiredStaffingConstraint } from "./RequiredStaffingConstraint.js";

describe("RequiredStaffingConstraint", () => {
  const june1 = WorkingDay.of(2026, 6, 1);
  const shiftIdsOf = (shiftName: string): string[] => {
    if (shiftName === "早番") return ["early"];
    if (shiftName === "遅番") return ["late"];
    return [];
  };

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });

  it("必要人数が未設定の日は違反にしない", () => {
    const schedule = emptySchedule();
    const constraints = [new RequiredStaffingConstraint(shiftIdsOf)];
    expect(schedule.checkConstraints(constraints)).toEqual([]);
  });

  it("必要人数を満たしていれば違反にしない", () => {
    let schedule = emptySchedule().setRequired(june1, "早番", 1);
    schedule = schedule.setCell("s1", june1, { kind: "work", shiftId: "early" });
    const constraints = [new RequiredStaffingConstraint(shiftIdsOf)];
    expect(schedule.checkConstraints(constraints)).toEqual([]);
  });

  it("必要人数に届かなければ日単位の違反を1件出す", () => {
    const schedule = emptySchedule().setRequired(june1, "早番", 2);
    const constraints = [new RequiredStaffingConstraint(shiftIdsOf)];
    const violations = schedule.checkConstraints(constraints);
    expect(violations.length).toBe(1);
    expect(violations[0].staffId).toBeUndefined();
    expect(violations[0].days).toEqual([june1]);
  });

  it("同じ日に複数勤務帯が同時に不足していても、violationは日1件に集約する", () => {
    const schedule = emptySchedule()
      .setRequired(june1, "早番", 1)
      .setRequired(june1, "遅番", 1);
    const constraints = [new RequiredStaffingConstraint(shiftIdsOf)];
    const violations = schedule.checkConstraints(constraints);
    expect(violations.length).toBe(1);
    expect(violations[0].message).toContain("早番");
    expect(violations[0].message).toContain("遅番");
  });

  it("同名で複数IDを持つ勤務帯でも、shiftIdsOf経由で合算して判定できる", () => {
    const multiShiftIdsOf = (shiftName: string): string[] =>
      shiftName === "早番" ? ["early-1", "early-2"] : [];
    let schedule = emptySchedule().setRequired(june1, "早番", 2);
    schedule = schedule
      .setCell("s1", june1, { kind: "work", shiftId: "early-1" })
      .setCell("s2", june1, { kind: "work", shiftId: "early-2" });
    const constraints = [new RequiredStaffingConstraint(multiShiftIdsOf)];
    expect(schedule.checkConstraints(constraints)).toEqual([]);
  });
});
