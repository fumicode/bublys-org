import {
  MonthlyStaffSchedule,
  ScheduleCandidates,
  ConstraintSet,
  ShiftLeaderRule,
  WorkShift,
  WorkingDay,
  WorkingStaffGroup,
  WorkingStaffMember,
} from "@bublys-org/hotel-shift-puzzle-model";
import { computeCandidatesFor, type CandidateRequest } from "./candidateRequest.js";

/**
 * worker へ渡せる plain だけから制約を組み立て直せているか（＝worker 越しでも
 * 同じ絞り込みが効くか）を確かめる。
 */
describe("computeCandidatesFor", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const late = WorkShift.of("late", "遅番", { hour: 15 });
  const day1 = WorkingDay.of(2026, 6, 1);
  const staffIds = ["L1", "L2", "X"];

  const constraints = new ConstraintSet({
    scheduleId: "sched-1",
    leaderRules: [
      new ShiftLeaderRule({
        key: "early",
        label: "早責",
        shiftName: "早番",
        leaderStaffIds: ["L1", "L2"],
        minCount: 1,
      }),
    ],
  });

  const baseSchedule = MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  });

  const requestFor = (
    schedule: MonthlyStaffSchedule,
    extra: Partial<CandidateRequest> = {}
  ): CandidateRequest => ({
    schedule: schedule.toPlain(),
    staffIds,
    workShifts: [early.state, late.state],
    constraints: constraints.toPlain(),
    checkShiftWish: false,
    wishes: [],
    staffGroup: null,
    ...extra,
  });

  it("plain から制約を組み立て直しても、責任者ルールによる絞り込みが効く", () => {
    const schedule = baseSchedule.setCell("L1", day1, {
      kind: "work",
      shiftId: "late",
    });

    const result = ScheduleCandidates.fromPlain(
      computeCandidatesFor(requestFor(schedule))
    );

    expect(result.candidatesOf("L2", day1)).toEqual([
      { kind: "work", shiftId: "early" },
    ]);
  });

  it("previous と changed を渡した差分計算は、全計算と同じ結果になる", () => {
    const previous = computeCandidatesFor(requestFor(baseSchedule));
    const schedule = baseSchedule.setCell("L1", day1, {
      kind: "work",
      shiftId: "late",
    });

    const incremental = computeCandidatesFor(
      requestFor(schedule, {
        previous,
        changed: [{ staffId: "L1", dayKey: day1.key }],
      })
    );

    expect(incremental).toEqual(computeCandidatesFor(requestFor(schedule)));
  });

  it("制約集約が無ければ、盤面の制約なしとして全候補が残る", () => {
    const result = ScheduleCandidates.fromPlain(
      computeCandidatesFor(requestFor(baseSchedule, { constraints: null }))
    );

    expect(result.candidatesOf("L2", day1)).toHaveLength(3);
  });

  it("#67 plain の勤務スタッフ群から、可能勤務帯で候補を絞れる", () => {
    // L2 と X は遅番しか入れない。L1 が遅番 → 早責を埋められる人は居ない
    const staffGroup = new WorkingStaffGroup({
      id: "sched-1",
      members: [
        new WorkingStaffMember({ staffId: "L1" }),
        new WorkingStaffMember({ staffId: "L2", allowedShiftIds: ["late"] }),
        new WorkingStaffMember({ staffId: "X", allowedShiftIds: ["late"] }),
      ],
    });
    const schedule = baseSchedule.setCell("L1", day1, {
      kind: "work",
      shiftId: "late",
    });

    const result = ScheduleCandidates.fromPlain(
      computeCandidatesFor(requestFor(schedule, { staffGroup: staffGroup.toPlain() }))
    );

    const lateOrOff = [{ kind: "work", shiftId: "late" }, { kind: "day-off" }];
    expect(result.candidatesOf("X", day1)).toEqual(lateOrOff);
    // 以前は「早番だけ（一意に決まる）」と、入れない勤務帯を提案していた
    expect(result.candidatesOf("L2", day1)).toEqual(lateOrOff);
  });
});
