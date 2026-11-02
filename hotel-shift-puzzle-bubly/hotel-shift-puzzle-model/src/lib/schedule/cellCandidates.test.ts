import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { WorkShift } from "./WorkShift.js";
import { WorkingDay } from "./WorkingDay.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import { legalCandidatesFor, violationsIntroducedBy } from "./cellCandidates.js";
import { AllowedShiftConstraint, ALLOWED_SHIFT_CONSTRAINT } from "./AllowedShiftConstraint.js";
import { WorkingStaffGroup } from "../staff/WorkingStaffGroup.js";
import { WorkingStaffMember } from "../staff/WorkingStaffMember.js";

describe("legalCandidatesFor", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });

  it("'undecided' は候補に含めない", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day1 = WorkingDay.of(2026, 6, 1);
    const candidates = legalCandidatesFor(schedule, [], "s1", day1, [early]);
    expect(candidates.some((c) => c.kind === "undecided")).toBe(false);
  });

  it("制約が無ければ、undecided以外の全候補が合法", () => {
    const schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const day1 = WorkingDay.of(2026, 6, 1);
    const candidates = legalCandidatesFor(schedule, [], "s1", day1, [early]);
    expect(candidates).toEqual(
      expect.arrayContaining([{ kind: "day-off" }, { kind: "work", shiftId: "early" }])
    );
    expect(candidates.length).toBe(2);
  });

  it("連勤上限に達していれば、出勤候補だけが除かれる（休みのみ合法）", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    const day6 = WorkingDay.of(2026, 6, 6);
    const constraints = [new MaxConsecutiveWorkdaysConstraint(5)];

    const candidates = legalCandidatesFor(schedule, constraints, "s1", day6, [early]);
    expect(candidates).toEqual([{ kind: "day-off" }]);
  });

  it("どの候補を選んでも別の制約に触れる場合は、合法な候補が0件になる", () => {
    let schedule = MonthlyStaffSchedule.create({
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    // s1: 1〜5日を出勤済み → 6日目に出勤すると連勤違反
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    // s2: 6日目を既に休みにして、1日の休み上限(1人)を使い切っておく
    // → 6日目に誰かが休みを追加すると上限違反
    const day6 = WorkingDay.of(2026, 6, 6);
    schedule = schedule.setCell("s2", day6, { kind: "day-off" });

    const constraints = [
      new MaxConsecutiveWorkdaysConstraint(5),
      new MaxDayOffPerDayConstraint(1),
    ];

    const candidates = legalCandidatesFor(schedule, constraints, "s1", day6, [early]);
    expect(candidates).toEqual([]);
  });
});

describe("violationsIntroducedBy（各値に替えたら新しく出る違反）", () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const empty = () =>
    MonthlyStaffSchedule.create({ id: "sched-1", storeId: "store-1", year: 2026, month: 6 });
  // s1 は遅番しか入れない
  const allowed = new AllowedShiftConstraint(
    new WorkingStaffGroup({
      id: "sched-1",
      members: [new WorkingStaffMember({ staffId: "s1", allowedShiftIds: ["late"] })],
    })
  );
  const early = { kind: "work", shiftId: "early" } as const;
  const late = { kind: "work", shiftId: "late" } as const;
  const off = { kind: "day-off" } as const;

  it("入れない勤務帯にだけ違反が付き、cells と同じ順で返る", () => {
    const result = violationsIntroducedBy(empty(), [allowed], "s1", day(1), [early, late, off]);
    expect(result.map((vs) => vs.map((v) => v.constraintType))).toEqual([
      [ALLOWED_SHIFT_CONSTRAINT],
      [],
      [],
    ]);
  });

  it("確定済みのセルは今の値から替えたときで見る（今の違反は新しい違反に数えない）", () => {
    const s = empty().setCell("s1", day(1), early); // すでに可能勤務帯違反
    const result = violationsIntroducedBy(s, [allowed], "s1", day(1), [early, late]);
    expect(result).toEqual([[], []]);
  });

  it("替えた先で別の制約に触れれば、それも出る", () => {
    let s = empty();
    for (let d = 1; d <= 5; d++) s = s.setCell("s1", day(d), late);
    const result = violationsIntroducedBy(
      s,
      [allowed, new MaxConsecutiveWorkdaysConstraint(5)],
      "s1",
      day(6),
      [early, late, off]
    );
    expect(result[0].map((v) => v.constraintType).sort()).toEqual(
      [ALLOWED_SHIFT_CONSTRAINT, new MaxConsecutiveWorkdaysConstraint(5).type].sort()
    );
    expect(result[1]).toHaveLength(1);
    expect(result[2]).toEqual([]);
  });
});
