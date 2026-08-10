import {
  WorkingDay,
  computeAllCandidates,
  createDefaultWorkShiftSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import { createSampleStaffList } from "./sampleStaff.js";
import { ALLOWED_SHIFT_IDS_BY_STAFF } from "./sampleAvailability.js";
import { createSampleShiftWishes } from "./sampleShiftWishes.js";
import { createSampleConstraintsFor } from "./sampleConstraints.js";
import { buildScheduleConstraints } from "../feature/scheduleConstraints.js";
import {
  createMidMonthSchedule,
  createEndgameSchedule,
  MID_MONTH_FOCUS_DAY,
  ENDGAME_DEAD_DAY,
  MID_MONTH_SCHEDULE_ID,
  ENDGAME_SCHEDULE_ID,
} from "./sampleScenarios.js";

/**
 * シナリオ勤務表は「確認したい状況が実際に起きること」まで含めてサンプルなので、
 * 起きているかをテストで固定する。データをいじって場面が消えたら、ここが落ちる。
 */
const workShifts = createDefaultWorkShiftSet("test").shifts;
const staffIds = createSampleStaffList().map((s) => s.id);
const wishes = createSampleShiftWishes();

const params = {
  staffIds,
  allowedShiftIds: ALLOWED_SHIFT_IDS_BY_STAFF,
  wishes,
  maxConsecutive: 5,
};

const constraintsFor = (scheduleId: string, maxDayOffPerDay?: number) => {
  const aggregate = createSampleConstraintsFor(
    scheduleId,
    maxDayOffPerDay === undefined ? {} : { maxDayOffPerDay }
  );
  const shiftIdsOf = (shiftName: string) =>
    workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
  const wishByStaff = new Map(wishes.map((w) => [w.staffId, w]));
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  return buildScheduleConstraints({
    modelConstraints: aggregate.modelConstraints(shiftIdsOf),
    wish: { wishByStaff, shiftNameById },
  });
};

describe("作成途中の勤務表（8月）", () => {
  const schedule = createMidMonthSchedule(params);
  const candidates = computeAllCandidates({
    schedule,
    constraints: constraintsFor(MID_MONTH_SCHEDULE_ID),
    workShifts,
    staffIds,
  });
  const focus = WorkingDay.of(2026, 8, MID_MONTH_FOCUS_DAY);

  it("20日までは全員ぶん埋まっている（候補集合は21日以降だけ）", () => {
    for (const staffId of staffIds) {
      expect(schedule.isUndecided(staffId, WorkingDay.of(2026, 8, 20))).toBe(false);
    }
    // 21日は「責任者を置いた人」以外が未定（そこを人が詰めていく状態）
    expect(schedule.isUndecided("staff-1", focus)).toBe(true);
    expect(schedule.isUndecided("staff-7", focus)).toBe(false); // 山本は休みで確定済み
  });

  it("責任者の残り1人が、その勤務帯に絞られる（確定提案が立つ）", () => {
    // 早責: 山本=休み・高橋=中番で確定 → 小林は早番しか取れない
    expect(candidates.candidatesOf("staff-8", focus)).toEqual([
      { kind: "work", shiftId: "early" },
    ]);
    // 夜責: 土屋=休みで確定 → 中村は遅番しか取れない
    expect(candidates.candidatesOf("staff-6", focus)).toEqual([
      { kind: "work", shiftId: "late" },
    ]);
  });

  it("5連勤に達した人は、休みしか取れない", () => {
    expect(candidates.candidatesOf("staff-9", focus)).toEqual([{ kind: "day-off" }]);
  });

  it("確定提案がまとまった数だけ立っている（Tab で流せる状態）", () => {
    expect(candidates.forcedCells().length).toBeGreaterThanOrEqual(3);
  });
});

describe("終盤の勤務表（9月）", () => {
  const schedule = createEndgameSchedule(params);
  const candidates = computeAllCandidates({
    schedule,
    constraints: constraintsFor(ENDGAME_SCHEDULE_ID, 5),
    workShifts,
    staffIds,
  });
  const deadDay = WorkingDay.of(2026, 9, ENDGAME_DEAD_DAY);

  it("出勤も休みもできないセルがある（詰み）", () => {
    expect(candidates.candidatesOf("staff-11", deadDay)).toEqual([]);
    expect(candidates.deadCells()).toContainEqual({
      staffId: "staff-11",
      day: expect.objectContaining({ state: { year: 2026, month: 9, day: 28 } }),
    });
  });
});
