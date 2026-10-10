import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { DayOffStyle } from '../staff/DayOffStyle.js';
import { compareRestPressure, restPressureOf } from './restPressure.js';
import type { DecodedWish } from './autoShiftStep.js';

describe('restPressureOf（その日を出勤にしたら、休みの形がどれだけ崩れるか）', () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const empty = () => MonthlyStaffSchedule.create({ id: 's', storeId: 'x', year: 2026, month: 6 });
  const ctx = (opts: { style?: DayOffStyle; prefs?: Record<number, DecodedWish>; minDayOff?: number } = {}) => ({
    dayOffStyleOf: () => opts.style ?? DayOffStyle.spread(),
    maxConsecutiveWorkdays: 5,
    minDayOff: opts.minDayOff,
    preferenceOf: (_: string, d: WorkingDay) => opts.prefs?.[d.day] ?? ({ kind: 'neutral' } as DecodedWish),
  });

  test('休めない日の連続を数える（出勤と、出勤の希望がある未定の日）', () => {
    const s = empty().assignShift('A', day(3), 'early').assignShift('A', day(4), 'early');
    const p = restPressureOf(s, ctx({ prefs: { 6: { kind: 'work', shiftId: 'early' } } }), 'A', day(5));
    expect(p.streak).toBe(4); // 3・4日の出勤 + 5日 + 6日の出勤の希望
    expect(p.overRun).toBe(0);
  });

  test('続けてよい日数を超えるなら overRun（連休型は目標の日数で）', () => {
    let s = empty();
    for (let d = 1; d <= 4; d++) s = s.assignShift('A', day(d), 'early');
    expect(restPressureOf(s, ctx(), 'A', day(5)).overRun).toBe(0);
    expect(restPressureOf(s, ctx({ style: DayOffStyle.clustered(4) }), 'A', day(5)).overRun).toBe(1);
  });

  test('連休型の、単発の休みの隣は pairSlot（分散型には無い）', () => {
    const s = empty().assignDayOff('A', day(4));
    expect(restPressureOf(s, ctx({ style: DayOffStyle.clustered(5) }), 'A', day(5)).pairSlot).toBe(1);
    expect(restPressureOf(s, ctx(), 'A', day(5)).pairSlot).toBe(0);
    // 既に連休なら相方は要らない
    const paired = s.assignDayOff('A', day(3));
    expect(restPressureOf(paired, ctx({ style: DayOffStyle.clustered(5) }), 'A', day(5)).pairSlot).toBe(0);
  });

  test('出勤にすると最低休日数を置く日が足りなくなるなら budget', () => {
    let s = empty();
    for (let d = 1; d <= 22; d++) s = s.assignShift('A', day(d), 'early');
    // 未定は23〜30日の8日。23日を出勤にすると7日しか残らず、8日休めない
    expect(restPressureOf(s, ctx({ minDayOff: 8 }), 'A', day(23)).budget).toBe(1);
    expect(restPressureOf(s, ctx({ minDayOff: 7 }), 'A', day(23)).budget).toBe(0);
  });

  test('比べる順は budget → overRun → pairSlot → streak', () => {
    const base = { budget: 0, overRun: 0, pairSlot: 0, streak: 1 };
    expect(compareRestPressure({ ...base, streak: 9 }, { ...base, pairSlot: 1 })).toBeLessThan(0);
    expect(compareRestPressure({ ...base, pairSlot: 1 }, { ...base, overRun: 1 })).toBeLessThan(0);
    expect(compareRestPressure({ ...base, overRun: 1 }, { ...base, budget: 1 })).toBeLessThan(0);
  });
});
