import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makePartnerCoverStep } from './partnerCoverStep.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

describe('makePartnerCoverStep（相方裏）', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));

  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const june1 = day(1);

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
    prefs: Record<string, DecodedWish> = {},
    extra?: Partial<AutoShiftContext>
  ): AutoShiftContext => ({
    staffIds,
    shiftIdByName,
    shiftNameById,
    preferenceOf: (staffId, d) => prefs[`${staffId}|${d.key}`] ?? { kind: 'neutral' },
    ...extra,
  });

  // 早責ペア（A・B）を対象に、早番を裏として埋める
  const step = makePartnerCoverStep('早番');

  test('一方が休みで相方が未定なら、相方を早番に入れる', () => {
    const schedule = emptySchedule().assignDayOff('A', june1); // A休み、B未定
    const result = step.run(schedule, ctxOf(['A', 'B']));

    expect(result.assigned).toBe(1);
    expect(result.schedule.getShiftIdFor('B', june1)).toBe('early');
    // 休みの A は触らない
    expect(result.schedule.isDayOff('A', june1)).toBe(true);
  });

  test('ペアの誰も休んでいない日は触らない（休みのときだけ）', () => {
    const schedule = emptySchedule(); // 両方未定
    const result = step.run(schedule, ctxOf(['A', 'B']));

    expect(result.assigned).toBe(0);
    expect(result.schedule.isUndecided('B', june1)).toBe(true);
  });

  test('既に相方が早番に入っていれば追加しない', () => {
    const schedule = emptySchedule()
      .assignDayOff('A', june1)
      .assignShift('B', june1, 'early'); // 既に充足
    const result = step.run(schedule, ctxOf(['A', 'B']));

    expect(result.assigned).toBe(0);
  });

  test('相方が人間入力済み（別の帯）なら上書きしない', () => {
    const schedule = emptySchedule()
      .assignDayOff('A', june1)
      .assignShift('B', june1, 'middle'); // B は中番で確定済み
    const result = step.run(schedule, ctxOf(['A', 'B']));

    expect(result.assigned).toBe(0);
    expect(result.schedule.getShiftIdFor('B', june1)).toBe('middle');
  });

  test('相方が早番に入れない（可能勤務帯外）なら入れない', () => {
    const schedule = emptySchedule().assignDayOff('A', june1);
    const result = step.run(
      schedule,
      ctxOf(['A', 'B'], {}, { isAvailable: (_id, shiftId) => shiftId !== 'early' })
    );

    expect(result.assigned).toBe(0);
    expect(result.schedule.isUndecided('B', june1)).toBe(true);
  });

  test('相方が休み希望なら早番に入れない（休み希望は尊重）', () => {
    const schedule = emptySchedule().assignDayOff('A', june1);
    const result = step.run(
      schedule,
      ctxOf(['A', 'B'], { [`B|${june1.key}`]: { kind: 'day-off' } })
    );

    expect(result.assigned).toBe(0);
  });

  test('両方休みなら何もしない', () => {
    const schedule = emptySchedule()
      .assignDayOff('A', june1)
      .assignDayOff('B', june1);
    const result = step.run(schedule, ctxOf(['A', 'B']));

    expect(result.assigned).toBe(0);
  });
});
