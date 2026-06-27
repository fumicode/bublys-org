import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';

describe('ShiftLeaderRule（責任者の宣言的ルール ＝ ORルール）', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const june1 = WorkingDay.of(2026, 6, 1);

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds: workShifts.map((w) => w.id),
    });

  // 早責: A・B のうち1人が早番に入っていればよい
  const rule = new ShiftLeaderRule({
    key: 'early',
    label: '早責',
    shiftName: '早番',
    leaderStaffIds: ['A', 'B'],
  });

  test('minCount は既定 1', () => {
    expect(rule.minCount).toBe(1);
  });

  test('countOnShift: 担当勤務帯に入っている責任者の数を数える', () => {
    const schedule = emptySchedule()
      .assignShift('A', june1, 'early')
      .assignShift('B', june1, 'middle'); // B は別帯
    expect(rule.countOnShift(schedule, june1, ['early'])).toBe(1);
  });

  test('isSatisfiedOn: 1人でも早番に入っていれば充足', () => {
    const schedule = emptySchedule().assignShift('A', june1, 'early');
    expect(rule.isSatisfiedOn(schedule, june1, ['early'])).toBe(true);
  });

  test('isSatisfiedOn: 誰も早番に入っていなければ非充足（別帯・休み・未定）', () => {
    const schedule = emptySchedule()
      .assignShift('A', june1, 'middle')
      .assignDayOff('B', june1);
    expect(rule.isSatisfiedOn(schedule, june1, ['early'])).toBe(false);
  });

  test('leaderStaffIds が空なら 0 / 非充足', () => {
    const empty = new ShiftLeaderRule({ key: 'x', label: 'x', shiftName: '早番', leaderStaffIds: [] });
    const schedule = emptySchedule().assignShift('A', june1, 'early');
    expect(empty.countOnShift(schedule, june1, ['early'])).toBe(0);
    expect(empty.isSatisfiedOn(schedule, june1, ['early'])).toBe(false);
  });

  test('minCount=2: 2人入って初めて充足', () => {
    const rule2 = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['A', 'B'],
      minCount: 2,
    });
    const one = emptySchedule().assignShift('A', june1, 'early');
    expect(rule2.isSatisfiedOn(one, june1, ['early'])).toBe(false);
    const two = one.assignShift('B', june1, 'early');
    expect(rule2.isSatisfiedOn(two, june1, ['early'])).toBe(true);
  });

  test('shiftIds は複数IDの集合でも数えられる（同名勤務帯が複数ID等）', () => {
    const schedule = emptySchedule()
      .assignShift('A', june1, 'early')
      .assignShift('B', june1, 'middle');
    // early と middle の両方を「担当帯」とみなせば A・B とも該当 → 2人
    expect(rule.countOnShift(schedule, june1, ['early', 'middle'])).toBe(2);
  });
});
