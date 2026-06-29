import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makeSatisfyLeaderRulesStep } from './satisfyLeaderRulesStep.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

describe('makeSatisfyLeaderRulesStep（責任者制約を満たす）', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));
  const june1 = WorkingDay.of(2026, 6, 1);

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

  const earlyRule = new ShiftLeaderRule({
    key: 'early',
    label: '早責',
    shiftName: '早番',
    leaderStaffIds: ['A', 'B'],
  });
  const step = makeSatisfyLeaderRulesStep([earlyRule]);

  test('誰も休んでいなくても、毎日 早番に責任者を1人入れて満たす（相方裏と違う点）', () => {
    const result = step.run(emptySchedule(), ctxOf(['A', 'B']));

    const days = result.schedule.workingDays();
    // 全 30 日、A か B のどちらかが早番に入っている
    for (const day of days) {
      const aOn = result.schedule.getShiftIdFor('A', day) === 'early';
      const bOn = result.schedule.getShiftIdFor('B', day) === 'early';
      expect(aOn || bOn).toBe(true);
    }
    expect(result.assigned).toBe(days.length);
  });

  test('既に満たされている日は触らない', () => {
    const schedule = emptySchedule().assignShift('A', june1, 'early');
    const result = step.run(schedule, ctxOf(['A', 'B']));

    // 6/1 は既に充足 → 追加なし。残り 29 日に1件ずつ
    expect(result.schedule.getShiftIdFor('B', june1)).toBeUndefined();
    expect(result.assigned).toBe(result.schedule.workingDays().length - 1);
  });

  test('minCount=2 なら毎日2人入れて満たす', () => {
    const rule2 = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['A', 'B'],
      minCount: 2,
    });
    const result = makeSatisfyLeaderRulesStep([rule2]).run(emptySchedule(), ctxOf(['A', 'B']));

    expect(result.schedule.getShiftIdFor('A', june1)).toBe('early');
    expect(result.schedule.getShiftIdFor('B', june1)).toBe('early');
  });

  test('休み希望・人間入力は尊重して埋められないこともある', () => {
    // A は 6/1 休み確定、B は 6/1 休み希望 → 6/1 は早番に誰も入れられない
    const schedule = emptySchedule().assignDayOff('A', june1);
    const result = step.run(
      schedule,
      ctxOf(['A', 'B'], { [`B|${june1.key}`]: { kind: 'day-off' } })
    );

    expect(result.schedule.getShiftIdFor('A', june1)).toBeUndefined();
    expect(result.schedule.isUndecided('B', june1)).toBe(true);
  });
});
