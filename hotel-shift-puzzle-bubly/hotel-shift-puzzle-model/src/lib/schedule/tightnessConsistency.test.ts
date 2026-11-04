import { ConstraintSet } from './ConstraintSet.js';
import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { ShiftIntervalRule } from './ShiftIntervalRule.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import { WorkingDay } from './WorkingDay.js';
import { MinMonthlyDayOffConstraint } from './MinMonthlyDayOffConstraint.js';

/**
 * 段階に分けた制約は、check() も段階の振り分けから導く（#229）。
 * だから「違反の件数」と「違反の段階の件数の合計」が食い違わない。全部の制約でそれを見張る。
 * 例外は月の休日だけ：check() は未定を楽観的に読み（もう届かないか）、tightness() は今のまま読む。
 */
describe('きつさの段階と check() が食い違わない', () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const shiftIdsOf = (name: string) => ({ 早番: ['early'], 遅番: ['late'] })[name] ?? [];

  const set = new ConstraintSet({
    id: 'sched-1',
    leaderRules: [
      new ShiftLeaderRule({ key: 'early', label: '早責', shiftName: '早番', leaderStaffIds: ['a'], minCount: 1 }),
      new ShiftLeaderRule({ key: 'late', label: '遅責', shiftName: '遅番', leaderStaffIds: ['a', 'b'], minCount: 2 }),
    ],
    shiftIntervalRules: [
      new ShiftIntervalRule({ key: 'late', fromShiftName: '遅番', forbiddenNextShiftNames: ['早番'], minRestHours: 8 }),
    ],
  })
    .withMaxConsecutiveWorkdays(3)
    .withMaxDayOffPerDay(1)
    .withMinMonthlyDayOff(8);

  /** 連勤の超過・遅番明け・責任者の不在と不足・休みの上限超えがそろって起きる勤務表 */
  const schedule = (() => {
    let s = MonthlyStaffSchedule.create({ id: 'sched-1', storeId: 'store-1', year: 2026, month: 6 });
    for (let d = 1; d <= 5; d++) s = s.assignShift('a', day(d), 'late'); // 5連勤
    s = s.assignShift('a', day(6), 'early'); // 遅番明けの早番
    s = s.assignShift('b', day(1), 'late');
    s = s.assignDayOff('b', day(7)).assignDayOff('c', day(7)); // 休み2人（上限1）
    return s;
  })();

  const constraints = set
    .modelConstraints(shiftIdsOf)
    .filter((c) => !(c instanceof MinMonthlyDayOffConstraint));

  test.each(constraints.map((c) => [c.type, c] as const))('%s', (_type, constraint) => {
    expect(constraint.tightnessUnits?.length).toBeGreaterThan(0);
    const amounts = constraint.tightness?.(schedule) ?? [];
    // 宣言した段階をすべて返す（0件の段階も）
    expect(amounts.map((a) => a.unit.key)).toEqual(constraint.tightnessUnits?.map((u) => u.key));
    const violating = amounts.filter((a) => a.isViolating).reduce((n, a) => n + a.amount, 0);
    expect(constraint.check(schedule)).toHaveLength(violating);
  });

  test('この勤務表で、どの制約も1件以上の違反を出している（見張りが空振りしていない）', () => {
    for (const c of constraints) expect(c.check(schedule).length).toBeGreaterThan(0);
  });

  test('★ 月の休日：check() は楽観的に（もう届かないか）、tightness() は今のまま（今どれだけ足りないか）', () => {
    const c = new MinMonthlyDayOffConstraint(8);
    // c は休み1日、残りは未定。まだ届きうるので違反ではないが、今は7日足りない
    expect(c.check(schedule).filter((v) => v.staffId === 'c')).toHaveLength(0);
    const short = Object.fromEntries(c.tightness(schedule).map((a) => [a.unit.key, a.amount]));
    expect(short['monthly-day-off-short-2-plus']).toBeGreaterThanOrEqual(1);
  });
});
