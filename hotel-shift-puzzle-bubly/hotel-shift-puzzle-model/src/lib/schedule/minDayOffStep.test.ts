import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makeMinDayOffStep } from './minDayOffStep.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

describe('makeMinDayOffStep（月◯日休む）', () => {
  const workShifts = createDefaultWorkShifts();
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));
  const day = (d: number) => WorkingDay.of(2026, 6, d);

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds: workShifts.map((w) => w.id),
    });

  const ctxOf = (
    staffIds: string[],
    prefs: Record<string, DecodedWish> = {}
  ): AutoShiftContext => ({
    staffIds,
    shiftIdByName,
    shiftNameById,
    preferenceOf: (staffId, d) => prefs[`${staffId}|${d.key}`] ?? { kind: 'neutral' },
  });

  const step = makeMinDayOffStep(8);

  test('休みが足りない分だけ入れて、月8日休めるようにする', () => {
    const result = step.run(emptySchedule(), ctxOf(['A']));

    expect(result.assigned).toBe(8);
    expect(result.schedule.countDayOffForStaff('A')).toBe(8);
  });

  test('既に休みがある分は数に入れ、不足分だけ足す', () => {
    let schedule = emptySchedule();
    // 既に3日休み（人間入力）
    for (const d of [1, 2, 3]) schedule = schedule.assignDayOff('A', day(d));
    const result = step.run(schedule, ctxOf(['A']));

    // 8 - 3 = 5 件追加
    expect(result.assigned).toBe(5);
    expect(result.schedule.countDayOffForStaff('A')).toBe(8);
  });

  test('既に8日以上休んでいる人は触らない', () => {
    let schedule = emptySchedule();
    for (let d = 1; d <= 8; d++) schedule = schedule.assignDayOff('A', day(d));
    const result = step.run(schedule, ctxOf(['A']));

    expect(result.assigned).toBe(0);
  });

  test('人間入力済みの出勤セルは休みで上書きしない（未定だけ触る）', () => {
    let schedule = emptySchedule();
    // 全日 早番で確定済み → 未定セルが無い
    for (let d = 1; d <= 30; d++) schedule = schedule.assignShift('A', day(d), 'early');
    const result = step.run(schedule, ctxOf(['A']));

    expect(result.assigned).toBe(0);
    expect(result.schedule.countDayOffForStaff('A')).toBe(0);
  });

  test('出勤希望（work）の日は休みにしない', () => {
    // 6月は30日。A は全日「早番がいい」希望 → どこにも休みを入れられない
    const prefs: Record<string, DecodedWish> = {};
    for (let d = 1; d <= 30; d++) prefs[`A|${day(d).key}`] = { kind: 'work', shiftId: 'early' };
    const result = step.run(emptySchedule(), ctxOf(['A'], prefs));

    expect(result.assigned).toBe(0);
  });

  test('maxPerDay: 1日の休み人数が上限を超えない', () => {
    // 3人×各8日休み。1日上限1人 → どの日も休みは1人以下
    const capped = makeMinDayOffStep(8, { maxPerDay: 1 });
    const result = capped.run(emptySchedule(), ctxOf(['A', 'B', 'C']));

    for (const day of result.schedule.workingDays()) {
      expect(result.schedule.countDayOffOn(day)).toBeLessThanOrEqual(1);
    }
  });

  test('phase を変えると別の休み配分（案）になる', () => {
    const p0 = makeMinDayOffStep(8, { phase: 0 }).run(emptySchedule(), ctxOf(['A']));
    const p1 = makeMinDayOffStep(8, { phase: 1 }).run(emptySchedule(), ctxOf(['A']));

    const offDays = (s: ReturnType<typeof emptySchedule>) =>
      s.workingDays().filter((d) => s.isDayOff('A', d)).map((d) => d.key).join(",");
    // どちらも8日休みだが、入る日が違う
    expect(p0.schedule.countDayOffForStaff('A')).toBe(8);
    expect(p1.schedule.countDayOffForStaff('A')).toBe(8);
    expect(offDays(p0.schedule)).not.toBe(offDays(p1.schedule));
  });
});
