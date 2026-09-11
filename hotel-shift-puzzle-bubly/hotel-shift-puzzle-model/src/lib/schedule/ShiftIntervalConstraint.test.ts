import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { ShiftIntervalRule } from './ShiftIntervalRule.js';
import {
  ShiftIntervalConstraint,
  SHIFT_INTERVAL_CONSTRAINT,
  isShiftIntervalConstraintType,
} from './ShiftIntervalConstraint.js';

describe('ShiftIntervalConstraint（勤務間インターバル制約）の使い方', () => {
  const YEAR = 2026;
  const MONTH = 6; // 30日まで

  /** 既定の勤務帯セット相当（早番7:00 / 中番9:00 / 遅番13:00） */
  const SHIFT_IDS: Record<string, string[]> = {
    早番: ['early'],
    中番: ['middle'],
    遅番: ['late'],
  };
  const shiftIdsOf = (name: string) => SHIFT_IDS[name] ?? [];

  const rule = new ShiftIntervalRule({
    key: 'late',
    fromShiftName: '遅番',
    forbiddenNextShiftNames: ['早番', '中番'],
    minRestHours: 8,
  });

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: YEAR,
      month: MONTH,
    });

  const day = (d: number) => WorkingDay.of(YEAR, MONTH, d);

  /** 1日目から順に割当を並べる（'-' は休み、null 相当の未定は undefined で表す） */
  const withRow = (staffId: string, shifts: (string | '-' | undefined)[]) => {
    let s = emptySchedule();
    shifts.forEach((shift, i) => {
      if (shift === undefined) return;
      s = shift === '-' ? s.assignDayOff(staffId, day(i + 1)) : s.assignShift(staffId, day(i + 1), shift);
    });
    return s;
  };

  const check = (schedule: MonthlyStaffSchedule) =>
    new ShiftIntervalConstraint(rule, shiftIdsOf).check(schedule);

  test('遅番の翌日が早番なら違反。範囲はその2日（つなぎ目）', () => {
    const violations = check(withRow('staff-A', ['late', 'early']));

    expect(violations).toHaveLength(1);
    const v = violations[0];
    expect(v.constraintType).toBe(`${SHIFT_INTERVAL_CONSTRAINT}:late`);
    expect(v.staffId).toBe('staff-A');
    expect(v.days.map((d) => d.day)).toEqual([1, 2]);
    expect(v.message).toContain('遅番の翌日に早番');
    expect(v.message).toContain('8時間');
  });

  test('遅番の翌日が中番でも違反', () => {
    const violations = check(withRow('staff-A', ['late', 'middle']));
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('遅番の翌日に中番');
  });

  test('遅番の翌日が遅番・休み・未定なら違反にならない', () => {
    expect(check(withRow('staff-A', ['late', 'late']))).toEqual([]);
    expect(check(withRow('staff-A', ['late', '-']))).toEqual([]);
    expect(check(withRow('staff-A', ['late', undefined]))).toEqual([]);
  });

  test('前日が遅番でなければ、翌日が早番でも違反にならない（中番→早番はこのルールの対象外）', () => {
    expect(check(withRow('staff-A', ['middle', 'early']))).toEqual([]);
    expect(check(withRow('staff-A', ['early', 'early']))).toEqual([]);
    expect(check(withRow('staff-A', ['-', 'early']))).toEqual([]);
  });

  test('見るのは隣り合う2日だけ（間に休みが挟まれば違反にならない）', () => {
    expect(check(withRow('staff-A', ['late', '-', 'early']))).toEqual([]);
  });

  test('月内に複数あればそれぞれ違反として返る', () => {
    const violations = check(
      withRow('staff-A', ['late', 'early', '-', 'late', 'middle'])
    );
    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.days.map((d) => d.day))).toEqual([
      [1, 2],
      [4, 5],
    ]);
  });

  test('スタッフごとに独立して判定する', () => {
    let s = withRow('staff-A', ['late', 'early']);
    s = s.assignShift('staff-B', day(1), 'late');
    s = s.assignShift('staff-B', day(2), 'late');
    const violations = check(s);
    expect(violations).toHaveLength(1);
    expect(violations[0].staffId).toBe('staff-A');
  });

  test('違反キーは2日の範囲まで含むので、同じスタッフの別の違反とぶつからない', () => {
    const violations = check(
      withRow('staff-A', ['late', 'early', '-', 'late', 'middle'])
    );
    expect(new Set(violations.map((v) => v.key)).size).toBe(2);
  });

  test('勤務帯名が解決できない勤務表（名前が違うセット）では何も出ない', () => {
    const constraint = new ShiftIntervalConstraint(rule, () => []);
    expect(constraint.check(withRow('staff-A', ['late', 'early']))).toEqual([]);
  });

  test('同名で開始時刻違いの勤務帯もまとめて対象になる', () => {
    const constraint = new ShiftIntervalConstraint(rule, (name) =>
      name === '遅番' ? ['late', 'late2'] : name === '早番' ? ['early', 'early2'] : []
    );
    expect(constraint.check(withRow('staff-A', ['late2', 'early2']))).toHaveLength(1);
  });

  test('describe は禁止する組と根拠（8時間）を1文で述べる', () => {
    expect(new ShiftIntervalConstraint(rule, shiftIdsOf).describe()).toBe(
      '遅番の翌日は早番・中番に入れない（帰宅から次の勤務まで8時間あける）'
    );
  });

  test('label は「遅番明け」（制約バーのキャプション）', () => {
    expect(new ShiftIntervalConstraint(rule, shiftIdsOf).label).toBe('遅番明け');
  });

  test('scope は staff（同じスタッフの前後の日にしか影響しない）', () => {
    expect(new ShiftIntervalConstraint(rule, shiftIdsOf).scope).toBe('staff');
  });

  test('isShiftIntervalConstraintType で表示側が印の形を選べる', () => {
    expect(isShiftIntervalConstraintType(`${SHIFT_INTERVAL_CONSTRAINT}:late`)).toBe(true);
    expect(isShiftIntervalConstraintType('max-consecutive-workdays')).toBe(false);
  });
});

describe('ShiftIntervalRule（宣言的ルール）', () => {
  const rule = new ShiftIntervalRule({
    key: 'late',
    fromShiftName: '遅番',
    forbiddenNextShiftNames: ['早番', '中番'],
  });

  test('minRestHours は既定 8 時間', () => {
    expect(rule.minRestHours).toBe(8);
  });

  test('allowsNextDay が「前日→翌日で入れるか」の唯一の判定（制約も生成器もここを呼ぶ）', () => {
    expect(rule.allowsNextDay('遅番', '早番')).toBe(false);
    expect(rule.allowsNextDay('遅番', '中番')).toBe(false);
    expect(rule.allowsNextDay('遅番', '遅番')).toBe(true);
  });

  test('前日がこのルールの勤務帯でなければ常に許可（中番→早番はこのルールの対象外）', () => {
    expect(rule.allowsNextDay('中番', '早番')).toBe(true);
    expect(rule.allowsNextDay('早番', '早番')).toBe(true);
  });

  test('名前が引けないセル（休み・未定・対象外の勤務帯）は undefined を渡す＝常に許可', () => {
    expect(rule.allowsNextDay(undefined, '早番')).toBe(true);
    expect(rule.allowsNextDay('遅番', undefined)).toBe(true);
  });

  test('インターバル時間を変えると根拠の文も変わる', () => {
    const longer = new ShiftIntervalRule({ ...rule.state, minRestHours: 11 });
    expect(longer.describe()).toContain('11時間');
  });
});
