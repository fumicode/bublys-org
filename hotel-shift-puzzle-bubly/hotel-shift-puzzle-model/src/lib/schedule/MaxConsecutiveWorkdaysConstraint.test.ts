import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import {
  MaxConsecutiveWorkdaysConstraint,
  MAX_CONSECUTIVE_WORKDAYS,
} from './MaxConsecutiveWorkdaysConstraint.js';

describe('MaxConsecutiveWorkdaysConstraint（連勤上限制約）の使い方', () => {
  const YEAR = 2026;
  const MONTH = 6; // 30日まで
  const SHIFT = 'early';

  /** 全セル未定の空き勤務表 */
  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: YEAR,
      month: MONTH,
      workShiftIds: [SHIFT],
    });

  const day = (d: number) => WorkingDay.of(YEAR, MONTH, d);

  /** staff を [from, to] 日の範囲すべて出勤にする */
  const workRange = (
    schedule: MonthlyStaffSchedule,
    staffId: string,
    from: number,
    to: number
  ): MonthlyStaffSchedule => {
    let s = schedule;
    for (let d = from; d <= to; d++) {
      s = s.assignShift(staffId, day(d), SHIFT);
    }
    return s;
  };

  const check = (schedule: MonthlyStaffSchedule, max = 5) =>
    new MaxConsecutiveWorkdaysConstraint(max).check(schedule);

  test('上限ちょうど（5連勤）は違反にならない', () => {
    const s = workRange(emptySchedule(), 'staff-A', 1, 5);
    expect(check(s)).toEqual([]);
  });

  test('6連勤は違反1件。違反範囲は連勤全体（6日）', () => {
    const s = workRange(emptySchedule(), 'staff-A', 1, 6);
    const violations = check(s);

    expect(violations).toHaveLength(1);
    const v = violations[0];
    expect(v.constraintType).toBe(MAX_CONSECUTIVE_WORKDAYS);
    expect(v.staffId).toBe('staff-A');
    expect(v.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(v.message).toContain('6連勤');
    expect(v.message).toContain('上限5');
  });

  test('休みが連勤を区切る（5連勤+休み+5連勤 は違反なし）', () => {
    let s = workRange(emptySchedule(), 'staff-A', 1, 5);
    s = s.assignDayOff('staff-A', day(6));
    s = workRange(s, 'staff-A', 7, 11);
    expect(check(s)).toEqual([]);
  });

  test('未定（割当なし）も連勤を区切る', () => {
    // 1-5 出勤、6 は未定（割当なし）、7-11 出勤 → どちらも5連勤で違反なし
    let s = workRange(emptySchedule(), 'staff-A', 1, 5);
    s = workRange(s, 'staff-A', 7, 11);
    expect(check(s)).toEqual([]);
  });

  test('連勤区間が2つあればそれぞれ違反として返る', () => {
    let s = workRange(emptySchedule(), 'staff-A', 1, 6); // 6連勤
    s = s.assignDayOff('staff-A', day(7));
    s = workRange(s, 'staff-A', 8, 14); // 7連勤
    const violations = check(s);

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.days.length).sort()).toEqual([6, 7]);
  });

  test('月末で終わる連勤も検出する（26〜30日の…手前から）', () => {
    const s = workRange(emptySchedule(), 'staff-A', 24, 30); // 7連勤
    const violations = check(s);
    expect(violations).toHaveLength(1);
    expect(violations[0].days.map((d) => d.day)).toEqual([24, 25, 26, 27, 28, 29, 30]);
  });

  test('スタッフごとに独立して判定する', () => {
    let s = workRange(emptySchedule(), 'staff-A', 1, 6); // 違反
    s = workRange(s, 'staff-B', 1, 5); // セーフ
    const violations = check(s);
    expect(violations).toHaveLength(1);
    expect(violations[0].staffId).toBe('staff-A');
  });

  test('上限を変えられる（max=3 なら4連勤で違反）', () => {
    const s = workRange(emptySchedule(), 'staff-A', 1, 4);
    expect(check(s, 5)).toEqual([]);
    expect(check(s, 3)).toHaveLength(1);
  });
});

describe('MonthlyStaffSchedule.checkConstraints（制約の注入）', () => {
  const baseSchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds: ['early'],
    });

  const workRange = (
    s: MonthlyStaffSchedule,
    staffId: string,
    from: number,
    to: number
  ) => {
    let next = s;
    for (let d = from; d <= to; d++) {
      next = next.assignShift(staffId, WorkingDay.of(2026, 6, d), 'early');
    }
    return next;
  };

  test('注入した制約すべてでチェックし、違反をまとめて返す', () => {
    const s = workRange(baseSchedule(), 'staff-A', 1, 6);
    const violations = s.checkConstraints([
      new MaxConsecutiveWorkdaysConstraint(5),
    ]);
    expect(violations).toHaveLength(1);
  });

  test('制約が空なら違反も空', () => {
    const s = workRange(baseSchedule(), 'staff-A', 1, 10);
    expect(s.checkConstraints([])).toEqual([]);
  });

  test('checkConstraints は state を変えない（不変）', () => {
    const s = workRange(baseSchedule(), 'staff-A', 1, 6);
    const before = s.toPlain();
    s.checkConstraints([new MaxConsecutiveWorkdaysConstraint(5)]);
    expect(s.toPlain()).toEqual(before);
  });
});
