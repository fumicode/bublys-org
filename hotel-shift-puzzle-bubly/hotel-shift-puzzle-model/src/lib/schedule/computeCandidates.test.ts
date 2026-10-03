import { MonthlyStaffSchedule, type ShiftCell } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";
import { WorkShift } from "./WorkShift.js";
import { ShiftLeaderRule } from "./ShiftLeaderRule.js";
import { ShiftLeaderConstraint } from "./ShiftLeaderConstraint.js";
import { MaxConsecutiveWorkdaysConstraint } from "./MaxConsecutiveWorkdaysConstraint.js";
import { MaxDayOffPerDayConstraint } from "./MaxDayOffPerDayConstraint.js";
import { ScheduleCandidates } from "./ScheduleCandidates.js";
import { computeAllCandidates, recomputeCandidates } from "./computeCandidates.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import { ConstraintSet } from "./ConstraintSet.js";
import { WorkingStaffGroup } from "../staff/WorkingStaffGroup.js";
import { WorkingStaffMember } from "../staff/WorkingStaffMember.js";

const early = WorkShift.of("early", "早番", { hour: 7 });
const late = WorkShift.of("late", "遅番", { hour: 15 });

const emptySchedule = () =>
  MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  });

describe("computeAllCandidates", () => {
  it("確定済みのセルは候補集合に載せない", () => {
    const day1 = WorkingDay.of(2026, 6, 1);
    const schedule = emptySchedule().setCell("s1", day1, {
      kind: "work",
      shiftId: "early",
    });

    const candidates = computeAllCandidates({
      schedule,
      constraints: [],
      workShifts: [early, late],
      staffIds: ["s1"],
    });

    expect(candidates.candidatesOf("s1", day1)).toBeUndefined();
    expect(candidates.candidatesOf("s1", WorkingDay.of(2026, 6, 2))).toHaveLength(3);
  });

  it("連勤上限に達していれば、そのセルは休みだけに絞られて確定手になる", () => {
    let schedule = emptySchedule();
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    const day6 = WorkingDay.of(2026, 6, 6);

    const candidates = computeAllCandidates({
      schedule,
      constraints: [new MaxConsecutiveWorkdaysConstraint(5)],
      workShifts: [early],
      staffIds: ["s1"],
    });

    expect(candidates.candidatesOf("s1", day6)).toEqual([{ kind: "day-off" }]);
    expect(candidates.forcedCells()).toContainEqual({
      staffId: "s1",
      day: expect.objectContaining({ state: { year: 2026, month: 6, day: 6 } }),
      cell: { kind: "day-off" },
    });
  });

  it("どの値を入れても違反するセルは、候補0件の詰みとして出る", () => {
    let schedule = emptySchedule();
    // s1: 1〜5日を出勤済み → 6日目に出勤すると連勤違反
    for (let d = 1; d <= 5; d++) {
      schedule = schedule.setCell("s1", WorkingDay.of(2026, 6, d), {
        kind: "work",
        shiftId: "early",
      });
    }
    // s2: 6日目を休みにして1日の休み上限(1人)を使い切る → 6日目に休みも取れない
    const day6 = WorkingDay.of(2026, 6, 6);
    schedule = schedule.setCell("s2", day6, { kind: "day-off" });

    const candidates = computeAllCandidates({
      schedule,
      constraints: [
        new MaxConsecutiveWorkdaysConstraint(5),
        new MaxDayOffPerDayConstraint(1),
      ],
      workShifts: [early],
      staffIds: ["s1", "s2"],
    });

    expect(candidates.candidatesOf("s1", day6)).toEqual([]);
    expect(candidates.deadCells()).toContainEqual({
      staffId: "s1",
      day: expect.objectContaining({ state: { year: 2026, month: 6, day: 6 } }),
    });
  });

  it("責任者が1人必要な日で、入れる人が1人しか残っていなければその勤務帯に絞られる", () => {
    // 早責の候補は L1 / L2 の2人。L1 が遅番で確定した日は、L2 が早番を取るしかない。
    const rule = new ShiftLeaderRule({
      key: "early",
      label: "早責",
      shiftName: "早番",
      leaderStaffIds: ["L1", "L2"],
      minCount: 1,
    });
    const constraints: ScheduleConstraint[] = [new ShiftLeaderConstraint(rule, ["early"])];
    const day1 = WorkingDay.of(2026, 6, 1);
    const schedule = emptySchedule().setCell("L1", day1, {
      kind: "work",
      shiftId: "late",
    });

    const candidates = computeAllCandidates({
      schedule,
      constraints,
      workShifts: [early, late],
      staffIds: ["L1", "L2", "X"],
    });

    // L2 は「早番以外を選ぶと早責が埋まらなくなる」ので早番だけに絞られる
    expect(candidates.candidatesOf("L2", day1)).toEqual([
      { kind: "work", shiftId: "early" },
    ]);
    // 責任者でない X は絞られない（早番に入っても早責は埋まらない）
    expect(candidates.candidatesOf("X", day1)).toHaveLength(3);
    // まだ2人とも空いている日は、どちらが取るか決まらないので絞らない
    expect(candidates.candidatesOf("L2", WorkingDay.of(2026, 6, 2))).toHaveLength(3);
  });
});

describe("recomputeCandidates", () => {
  const rule = new ShiftLeaderRule({
    key: "early",
    label: "早責",
    shiftName: "早番",
    leaderStaffIds: ["L1", "L2"],
    minCount: 1,
  });
  const constraints: ScheduleConstraint[] = [new ShiftLeaderConstraint(rule, ["early"])];
  const staffIds = ["L1", "L2", "X"];
  const workShifts = [early, late];
  const day1 = WorkingDay.of(2026, 6, 1);

  it("影響範囲だけ計算し直しても、全計算と同じ結果になる", () => {
    const before = emptySchedule();
    const previous = computeAllCandidates({
      schedule: before,
      constraints,
      workShifts,
      staffIds,
    });

    const after = before.setCell("L1", day1, { kind: "work", shiftId: "late" });
    const input = { schedule: after, constraints, workShifts, staffIds };

    const incremental = recomputeCandidates(previous, input, [
      { staffId: "L1", day: day1 },
    ]);

    expect(incremental.toPlain()).toEqual(computeAllCandidates(input).toPlain());
  });

  it("確定したセルは候補集合から外れる", () => {
    const before = emptySchedule();
    const previous = computeAllCandidates({
      schedule: before,
      constraints,
      workShifts,
      staffIds,
    });
    expect(previous.candidatesOf("L1", day1)).toBeDefined();

    const after = before.setCell("L1", day1, { kind: "work", shiftId: "late" });
    const next = recomputeCandidates(
      previous,
      { schedule: after, constraints, workShifts, staffIds },
      [{ staffId: "L1", day: day1 }]
    );

    expect(next.candidatesOf("L1", day1)).toBeUndefined();
    expect(next.size).toBe(previous.size - 1);
  });

  it("勤務表が変わっていれば全計算にフォールバックする", () => {
    const other = MonthlyStaffSchedule.create({
      id: "sched-2",
      storeId: "store-1",
      year: 2026,
      month: 6,
    });
    const previous = computeAllCandidates({
      schedule: emptySchedule(),
      constraints,
      workShifts,
      staffIds,
    });

    const next = recomputeCandidates(
      previous,
      { schedule: other, constraints, workShifts, staffIds },
      []
    );

    expect(next.scheduleId).toBe("sched-2");
    expect(next.size).toBe(previous.size);
  });
});

/**
 * 候補集合は「そこに至る編集の順番」ではなく「今の盤面」だけで決まっていなければならない。
 * 差分計算で引き継ぐのは合法候補（legalByCell）だけで、絞り込みは毎回掛け直す——という
 * computeCandidates の作りを、書き換えの多い終盤の操作で固定する。
 */
describe("候補集合は盤面だけの関数である（編集履歴に依存しない）", () => {
  const earlyRule = new ShiftLeaderRule({
    key: "early",
    label: "早責",
    shiftName: "早番",
    leaderStaffIds: ["L1", "L2"],
    minCount: 1,
  });
  const constraints: ScheduleConstraint[] = [
    new ShiftLeaderConstraint(earlyRule, ["early"]),
    new MaxConsecutiveWorkdaysConstraint(5),
  ];
  const staffIds = ["L1", "L2", "X"];
  const workShifts = [early, late];
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const earlyCell: ShiftCell = { kind: "work", shiftId: "early" };
  const lateCell: ShiftCell = { kind: "work", shiftId: "late" };
  const undecided: ShiftCell = { kind: "undecided" };

  type Board = {
    schedule: MonthlyStaffSchedule;
    candidates: ScheduleCandidates;
  };

  const full = (schedule: MonthlyStaffSchedule) =>
    computeAllCandidates({ schedule, constraints, workShifts, staffIds });

  const start = (): Board => {
    const schedule = emptySchedule();
    return { schedule, candidates: full(schedule) };
  };

  /** 1セル編集して影響範囲だけ計算し直す（アプリと同じ流れ） */
  const edit = (current: Board, staffId: string, d: number, to: ShiftCell): Board => {
    const schedule = current.schedule.setCell(staffId, day(d), to);
    return {
      schedule,
      candidates: recomputeCandidates(
        current.candidates,
        { schedule, constraints, workShifts, staffIds },
        [{ staffId, day: day(d) }]
      ),
    };
  };

  /** 差分で辿り着いた候補集合が、その盤面を全計算したものと一致すること */
  const expectSameAsFull = (board: Board) => {
    expect(board.candidates.toPlain()).toEqual(full(board.schedule).toPlain());
  };

  it("確定セルを未定へ差し戻すと、そのセルが候補集合に戻る", () => {
    const decided = edit(start(), "L1", 1, lateCell);
    expect(decided.candidates.candidatesOf("L1", day(1))).toBeUndefined();

    const reverted = edit(decided, "L1", 1, undecided);
    expect(reverted.candidates.candidatesOf("L1", day(1))).toHaveLength(3);
    expectSameAsFull(reverted);
  });

  it("絞り込みの原因になった確定セルを書き換えると、絞り込みが解ける", () => {
    // L1 が遅番に入ると、早責を埋められるのは L2 だけになる → L2 は早番に絞られる
    const narrowed = edit(start(), "L1", 1, lateCell);
    expect(narrowed.candidates.candidatesOf("L2", day(1))).toEqual([earlyCell]);

    // L1 を早番へ書き換えると早責は埋まる → L2 の絞り込みは消えていなければならない
    const rewritten = edit(narrowed, "L1", 1, earlyCell);
    expect(rewritten.candidates.candidatesOf("L2", day(1))).toHaveLength(3);
    expectSameAsFull(rewritten);
  });

  it("絞り込み前の合法候補は、絞り込みとは別に保たれる", () => {
    const narrowed = edit(start(), "L1", 1, lateCell);
    // 公開する候補は絞り込み後、土台は絞り込み前
    expect(narrowed.candidates.candidatesOf("L2", day(1))).toEqual([earlyCell]);
    expect(narrowed.candidates.legalCandidatesOf("L2", day(1))).toHaveLength(3);
  });

  it("何手編集しても、その盤面を全計算した結果と一致する", () => {
    let board = start();
    // 確定 → 確定 → 書き換え → 差し戻し と、終盤にありがちな操作を混ぜる
    const steps: Array<[string, number, ShiftCell]> = [
      ["L1", 1, lateCell],
      ["X", 1, earlyCell],
      ["L1", 2, earlyCell],
      ["L1", 1, earlyCell], // 書き換え（絞り込みの前提が崩れる）
      ["X", 1, undecided], // 差し戻し
      ["L2", 2, lateCell],
      ["L1", 2, undecided], // 差し戻し（絞り込みが復活する）
    ];
    for (const [staffId, d, to] of steps) {
      board = edit(board, staffId, d, to);
      expectSameAsFull(board);
    }
  });
});

describe("可能勤務帯（その人が入れる勤務帯）で候補の元を絞る", () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const leaderRule = new ShiftLeaderRule({
    key: "early",
    label: "早責",
    shiftName: "早番",
    leaderStaffIds: ["L1", "L2"],
    minCount: 1,
  });
  /** L2 と X は遅番しか入れない。L1 は絞っていない */
  const group = new WorkingStaffGroup({
    id: "sched-1",
    members: [
      new WorkingStaffMember({ staffId: "L1" }),
      new WorkingStaffMember({ staffId: "L2", allowedShiftIds: ["late"] }),
      new WorkingStaffMember({ staffId: "X", allowedShiftIds: ["late"] }),
    ],
  });
  const input = (schedule: MonthlyStaffSchedule) => ({
    schedule,
    constraints: [new ShiftLeaderConstraint(leaderRule, ["early"])] as ScheduleConstraint[],
    workShifts: [early, late],
    staffIds: ["L1", "L2", "X"],
    staffGroup: group,
  });

  it("絞った人の候補には、入れない勤務帯が出ない", () => {
    const candidates = computeAllCandidates(input(emptySchedule()));

    expect(candidates.candidatesOf("X", day(1))).toEqual([
      { kind: "work", shiftId: "late" },
      { kind: "day-off" },
    ]);
  });

  it("絞っていない人は、今まで通り全勤務帯が候補になる", () => {
    const candidates = computeAllCandidates({ ...input(emptySchedule()), constraints: [] });

    expect(candidates.candidatesOf("L1", day(1))).toHaveLength(3);
  });

  it("入れる人が可能勤務帯で1人に絞られれば、その人に確定提案が出る", () => {
    // 早責を埋められるのは L1 と L2 だが、L2 は早番に入れない ＝ L1 が早番を取るしかない
    const candidates = computeAllCandidates(input(emptySchedule()));

    expect(candidates.candidatesOf("L1", day(1))).toEqual([
      { kind: "work", shiftId: "early" },
    ]);
  });

  it("入れない勤務帯を「一意に決まる」と提案しない", () => {
    // L1 が遅番 → 早責を埋められるのは L2 だけだが、L2 は早番に入れない
    const schedule = emptySchedule().setCell("L1", day(1), { kind: "work", shiftId: "late" });
    const candidates = computeAllCandidates(input(schedule));

    expect(candidates.candidatesOf("L2", day(1))).toEqual([
      { kind: "work", shiftId: "late" },
      { kind: "day-off" },
    ]);
    expect(
      candidates.forcedCells().filter((f) => f.staffId === "L2" && f.day.equals(day(1)))
    ).toEqual([]);
  });

  it("制約を満たす値が入れない勤務帯しか無いセルは、詰みとして出る", () => {
    // s1 は早番しか入れない。1日に遅番 → 2日は遅番明けで早番に入れず、
    // s2 が休んで休み上限（1人）を使い切っているので休めない。残る遅番には入れない。
    const shiftIdsOf = (name: string) =>
      [early, late].filter((w) => w.name === name).map((w) => w.id);
    const schedule = emptySchedule()
      .setCell("s1", day(1), { kind: "work", shiftId: "late" })
      .setCell("s2", day(2), { kind: "day-off" });
    const candidates = computeAllCandidates({
      schedule,
      constraints: [
        ...ConstraintSet.empty("sched-1").intervalConstraints(shiftIdsOf),
        new MaxDayOffPerDayConstraint(1),
      ],
      workShifts: [early, late],
      staffIds: ["s1", "s2"],
      staffGroup: new WorkingStaffGroup({
        id: "sched-1",
        members: [
          new WorkingStaffMember({ staffId: "s1", allowedShiftIds: ["early"] }),
          new WorkingStaffMember({ staffId: "s2" }),
        ],
      }),
    });

    expect(candidates.candidatesOf("s1", day(2))).toEqual([]);
    expect(candidates.deadCells()).toContainEqual(
      expect.objectContaining({ staffId: "s1", day: day(2) })
    );
  });

  it("差分計算しても、全計算と同じ結果になる", () => {
    const before = emptySchedule();
    const previous = computeAllCandidates(input(before));
    const after = before.setCell("L1", day(1), { kind: "work", shiftId: "late" });

    expect(
      recomputeCandidates(previous, input(after), [{ staffId: "L1", day: day(1) }]).toPlain()
    ).toEqual(computeAllCandidates(input(after)).toPlain());
  });
});
