import {
  MAX_CONSECUTIVE_WORKDAYS,
  MonthlyStaffSchedule,
  ScheduleCandidates,
  WorkingDay,
  computeAllCandidates,
  createDefaultWorkShiftSet,
  findRepairsForDeadCell,
  recomputeCandidates,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { createSampleStaffList } from "./sampleStaff.js";
import { ALLOWED_SHIFT_IDS_BY_STAFF } from "./sampleAvailability.js";
import { createSampleShiftWishes } from "./sampleShiftWishes.js";
import { createSampleConstraintsFor } from "./sampleConstraints.js";
import { buildScheduleConstraints } from "../feature/scheduleConstraints.js";
import {
  createMidMonthSchedule,
  createEndgameSchedule,
  MID_MONTH_SCHEDULE_ID,
  ENDGAME_SCHEDULE_ID,
  ENDGAME_DEAD_DAY,
  ENDGAME_DEAD_STAFF_ID,
  ENDGAME_STREAK_START_DAY,
  ENDGAME_FIX_DAY,
  ENDGAME_MAX_DAY_OFF_PER_DAY,
  HAND_FILLED_THROUGH,
  CHAIN_START_DAY,
} from "./sampleScenarios.js";

/**
 * シナリオ勤務表は「確認したい状況が実際に起きること」まで含めてサンプルなので、
 * 起きているかをテストで固定する。データをいじって場面が消えたら、ここが落ちる。
 */
const workShifts = createDefaultWorkShiftSet("test").shifts;
const staffIds = createSampleStaffList().map((s) => s.id);
const wishes = createSampleShiftWishes();

const schedule = createMidMonthSchedule({
  staffIds,
  allowedShiftIds: ALLOWED_SHIFT_IDS_BY_STAFF,
  wishes,
  maxConsecutive: 5,
});

const aggregate = createSampleConstraintsFor(MID_MONTH_SCHEDULE_ID);
const constraints = buildScheduleConstraints({
  modelConstraints: aggregate.modelConstraints((shiftName) =>
    workShifts.filter((w) => w.name === shiftName).map((w) => w.id)
  ),
  wish: {
    wishByStaff: new Map(wishes.map((w) => [w.staffId, w])),
    shiftNameById: new Map(workShifts.map((w) => [w.id, w.name])),
  },
});
const input = { schedule, constraints, workShifts, staffIds };

const aug = (day: number) => WorkingDay.of(2026, 8, day);
const early: ShiftCell = { kind: "work", shiftId: "early" };
const late: ShiftCell = { kind: "work", shiftId: "late" };
const dayOff: ShiftCell = { kind: "day-off" };

/**
 * 提案を承認して、その影響範囲だけ候補集合を計算し直す（アプリと同じ流れ）。
 *
 * 併せて「差分で辿り着いた候補集合＝その盤面を全計算したもの」を毎手つき合わせる。
 * 候補集合はそこに至る編集の順番ではなく今の盤面だけで決まる、という不変条件の回帰テスト
 * （computeCandidates.ts を参照）。
 */
function approve(
  current: { schedule: MonthlyStaffSchedule; candidates: ScheduleCandidates },
  staffId: string,
  day: WorkingDay,
  cell: ShiftCell
) {
  const next = current.schedule.setCell(staffId, day, cell);
  const candidates = recomputeCandidates(
    current.candidates,
    { ...input, schedule: next },
    [{ staffId, day }]
  );
  expect(candidates.toPlain()).toEqual(
    computeAllCandidates({ ...input, schedule: next }).toPlain()
  );
  return { schedule: next, candidates };
}

describe("作成途中の勤務表（2026年8月）", () => {
  const initial = {
    schedule,
    candidates: computeAllCandidates(input),
  };

  it("22日まで全員ぶん埋まっていて、23日以降が未定として残る", () => {
    for (const staffId of staffIds) {
      // 21・22日にわざと残した未定セル以外は、22日まで決まっている
      const decidedByDay20 = !schedule.isUndecided(staffId, aug(20));
      expect(decidedByDay20).toBe(true);
    }
    expect(schedule.isUndecided("staff-1", aug(HAND_FILLED_THROUGH + 1))).toBe(true);
  });

  it("希望に沿って組まれている（休み希望の日は休みになっている）", () => {
    expect(schedule.isDayOff("staff-7", aug(21))).toBe(true); // 山本
    expect(schedule.isDayOff("staff-tsuchiya", aug(21))).toBe(true); // 土屋
    expect(schedule.isDayOff("staff-5", aug(18))).toBe(true); // 伊藤
  });

  it("連勤上限を超えている人がいない（組んだ盤面自体は破綻していない）", () => {
    const violations = schedule.checkConstraints(constraints);
    expect(
      violations.filter((v) => v.constraintType === MAX_CONSECUTIVE_WORKDAYS)
    ).toEqual([]);
  });

  it("21日は、責任者が2人抜けたことで2セルが一意に決まる", () => {
    const focus = aug(CHAIN_START_DAY);
    // 早責が早番に居ない → 早番に入れる早責は小林だけ
    expect(initial.candidates.candidatesOf("staff-8", focus)).toEqual([early]);
    // 夜責が遅番に居ない → 土屋が休みなので中村だけ
    expect(initial.candidates.candidatesOf("staff-6", focus)).toEqual([late]);
  });

  it("承認すると次の一手が現れる（連鎖する）", () => {
    // 21日の中村＝遅番を承認 → 5連勤に達するので、22日の中村は休みしか取れなくなる
    const afterNakamura = approve(initial, "staff-6", aug(CHAIN_START_DAY), late);
    expect(afterNakamura.candidates.candidatesOf("staff-6", aug(22))).toEqual([dayOff]);

    // その休みを承認しても、22日の小林は早番のまま（早責が中番に回っているため）
    const afterRest = approve(afterNakamura, "staff-6", aug(22), dayOff);
    expect(afterRest.candidates.candidatesOf("staff-8", aug(22))).toEqual([early]);

    // 22日の小林＝早番を承認すると、田中が5連勤に達し、23日の田中は休みに決まる
    const afterKobayashi = approve(afterRest, "staff-8", aug(22), early);
    expect(afterKobayashi.candidates.candidatesOf("staff-4", aug(23))).toEqual([dayOff]);

    // 田中が休むと、23日に予責を早番で担えるのは山本だけになる
    const afterTanaka = approve(afterKobayashi, "staff-4", aug(23), dayOff);
    expect(afterTanaka.candidates.candidatesOf("staff-7", aug(23))).toEqual([early]);
  });
});


/**
 * 終盤シナリオは「28日の佐藤が詰んでいる」ことがすべてなので、そこに至る条件を1つずつ固定する。
 * 詰みは勤務表とこの勤務表自身の制約だけで決まる（希望データに依存しない）ことも確かめる。
 */
describe("終盤・詰みありの勤務表（2026年9月）", () => {
  const endgame = createEndgameSchedule({
    staffIds,
    allowedShiftIds: ALLOWED_SHIFT_IDS_BY_STAFF,
    wishes,
    maxConsecutive: 5,
  });
  const endgameAggregate = createSampleConstraintsFor(ENDGAME_SCHEDULE_ID, {
    maxDayOffPerDay: ENDGAME_MAX_DAY_OFF_PER_DAY,
  });
  const modelConstraints = endgameAggregate.modelConstraints((shiftName) =>
    workShifts.filter((w) => w.name === shiftName).map((w) => w.id)
  );
  const endgameConstraints = buildScheduleConstraints({
    modelConstraints,
    wish: {
      wishByStaff: new Map(wishes.map((w) => [w.staffId, w])),
      shiftNameById: new Map(workShifts.map((w) => [w.id, w.name])),
    },
  });
  const endgameInput = {
    schedule: endgame,
    constraints: endgameConstraints,
    workShifts,
    staffIds,
  };
  const sep = (day: number) => WorkingDay.of(2026, 9, day);
  const deadDay = sep(ENDGAME_DEAD_DAY);
  const deadCellKeys = (candidates: ScheduleCandidates) =>
    candidates.deadCells().map((cell) => `${cell.staffId}:${cell.day.key}`);

  it("28日の佐藤だけが未定で、ほかは全部決まっている", () => {
    const undecided = staffIds.flatMap((staffId) =>
      endgame
        .workingDays()
        .filter((day) => endgame.isUndecided(staffId, day))
        .map((day) => `${staffId}:${day.key}`)
    );
    expect(undecided).toEqual([`${ENDGAME_DEAD_STAFF_ID}:${deadDay.key}`]);
  });

  it("詰み以外は成立している（違反は28日の必要人数不足だけ）", () => {
    // 責任者の居ない日や連勤オーバーが散っていると、詰みがその中に埋もれてしまう
    const violations = endgame.checkConstraints(endgameConstraints);
    expect(
      violations.map((v) => `${v.constraintType}@${v.days.map((d) => d.day).join(",")}`)
    ).toEqual([`required-staffing@${ENDGAME_DEAD_DAY}`]);
  });

  it("佐藤は出勤できない（23〜27日の5連勤）", () => {
    for (let d = ENDGAME_STREAK_START_DAY; d < ENDGAME_DEAD_DAY; d++) {
      expect(endgame.isWorking(ENDGAME_DEAD_STAFF_ID, sep(d))).toBe(true);
    }
    expect(endgame.isDayOff(ENDGAME_DEAD_STAFF_ID, sep(ENDGAME_STREAK_START_DAY - 1))).toBe(
      true
    );
  });

  it("佐藤は休めない（28日は休みが上限ちょうど）", () => {
    expect(endgame.countDayOffOn(deadDay)).toBe(ENDGAME_MAX_DAY_OFF_PER_DAY);
    // どの日も上限を超えていない＝28日だけが特別に厳しいわけではない
    for (const day of endgame.workingDays()) {
      expect(endgame.countDayOffOn(day)).toBeLessThanOrEqual(ENDGAME_MAX_DAY_OFF_PER_DAY);
    }
  });

  it("28日の佐藤は候補0件＝詰みとして検知される", () => {
    const candidates = computeAllCandidates(endgameInput);

    expect(candidates.candidatesOf(ENDGAME_DEAD_STAFF_ID, deadDay)).toEqual([]);
    expect(deadCellKeys(candidates)).toEqual([
      `${ENDGAME_DEAD_STAFF_ID}:${deadDay.key}`,
    ]);
  });

  it("希望データが入っていなくても詰みは成立する", () => {
    // 詰みの理由は連勤上限と休み上限で、どちらも勤務表と勤務表自身の制約だけで決まる。
    // シフト希望が seed されていない環境でも同じ盤面になる、を固定する。
    const withoutWish = computeAllCandidates({
      ...endgameInput,
      constraints: buildScheduleConstraints({ modelConstraints }),
    });
    expect(withoutWish.candidatesOf(ENDGAME_DEAD_STAFF_ID, deadDay)).toEqual([]);
  });

  it("なぜどの値も入らないのかを、値ごとに説明できる", () => {
    const diagnosis = findRepairsForDeadCell(endgameInput, {
      staffId: ENDGAME_DEAD_STAFF_ID,
      day: deadDay,
    });

    const reasonTypes = new Map(
      diagnosis.blocked.map((b) => [
        b.cell.kind === "work" ? b.cell.shiftId : b.cell.kind,
        b.blockedBy.map((v) => v.constraintType),
      ])
    );
    // 出勤はどの勤務帯も連勤上限、休みは休み上限で塞がっている
    expect(reasonTypes.get("early")).toEqual(["max-consecutive-workdays"]);
    expect(reasonTypes.get("middle")).toEqual(["max-consecutive-workdays"]);
    expect(reasonTypes.get("late")).toEqual(["max-consecutive-workdays"]);
    expect(reasonTypes.get("day-off")).toEqual(["max-day-off-per-day"]);
  });

  it("詰みを代償なしで解消する1手を見つけられる", () => {
    const diagnosis = findRepairsForDeadCell(endgameInput, {
      staffId: ENDGAME_DEAD_STAFF_ID,
      day: deadDay,
    });

    expect(diagnosis.repairs.length).toBeGreaterThan(0);

    // 28日に休んでいる人を中番に入れれば、人数不足が埋まり休み枠も空く＝代償なしで解ける
    const best = diagnosis.repairs[0];
    expect(best.costs).toEqual([]);
    expect(best.day.key).toBe(deadDay.key);
    expect(best.to).toEqual({ kind: "work", shiftId: "middle" });
    expect(best.unlocks).toEqual([{ kind: "day-off" }]);

    // 実際にその手を打つと詰みが消える
    const applied = endgame.setCell(best.staffId, best.day, best.to);
    const after = computeAllCandidates({ ...endgameInput, schedule: applied });
    expect(deadCellKeys(after)).toEqual([]);
    expect(after.candidatesOf(ENDGAME_DEAD_STAFF_ID, deadDay)).toEqual([
      { kind: "day-off" },
    ]);
  });

  it("連勤の途中を休みに書き換えると詰みが解け、中番の確定提案に変わる", () => {
    const before = computeAllCandidates(endgameInput);

    const fixDay = sep(ENDGAME_FIX_DAY);
    const rewritten = endgame.setCell(ENDGAME_DEAD_STAFF_ID, fixDay, {
      kind: "day-off",
    });
    const after = recomputeCandidates(
      before,
      { ...endgameInput, schedule: rewritten },
      [{ staffId: ENDGAME_DEAD_STAFF_ID, day: fixDay }]
    );

    // 出勤できるようになり、28日に足りないのは中番だけなので中番に絞られる
    expect(deadCellKeys(after)).toEqual([]);
    expect(after.candidatesOf(ENDGAME_DEAD_STAFF_ID, deadDay)).toEqual([
      { kind: "work", shiftId: "middle" },
    ]);
    // 差分計算がその盤面の全計算と一致していること
    expect(after.toPlain()).toEqual(
      computeAllCandidates({ ...endgameInput, schedule: rewritten }).toPlain()
    );
  });
});
