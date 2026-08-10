import {
  MAX_CONSECUTIVE_WORKDAYS,
  MonthlyStaffSchedule,
  ScheduleCandidates,
  WorkingDay,
  computeAllCandidates,
  createDefaultWorkShiftSet,
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
  MID_MONTH_SCHEDULE_ID,
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

/** 提案を承認して、その影響範囲だけ候補集合を計算し直す（アプリと同じ流れ） */
function approve(
  current: { schedule: MonthlyStaffSchedule; candidates: ScheduleCandidates },
  staffId: string,
  day: WorkingDay,
  cell: ShiftCell
) {
  const next = current.schedule.setCell(staffId, day, cell);
  return {
    schedule: next,
    candidates: recomputeCandidates(
      current.candidates,
      { ...input, schedule: next },
      [{ staffId, day }]
    ),
  };
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
