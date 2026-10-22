import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { ConstraintSet } from './ConstraintSet.js';
import {
  AllowedShiftConstraint,
  ALLOWED_SHIFT_CONSTRAINT,
} from './AllowedShiftConstraint.js';
import { WorkingStaffGroup } from '../staff/WorkingStaffGroup.js';
import { WorkingStaffMember } from '../staff/WorkingStaffMember.js';

describe('AllowedShiftConstraint（可能勤務帯の外に入れたら違反）', () => {
  const YEAR = 2026;
  const MONTH = 6;
  const day = (d: number) => WorkingDay.of(YEAR, MONTH, d);

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: YEAR,
      month: MONTH,
    });

  // limited は遅番しか入れない。free は絞っていない
  const group = new WorkingStaffGroup({
    id: 'sched-1',
    members: [
      new WorkingStaffMember({ staffId: 'limited', allowedShiftIds: ['late'] }),
      new WorkingStaffMember({ staffId: 'free' }),
    ],
  });
  const constraint = new AllowedShiftConstraint(
    group,
    new Map([
      ['early', '早番'],
      ['late', '遅番'],
    ])
  );

  test('入れない勤務帯に入れると、そのセルの違反になる', () => {
    const s = emptySchedule().assignShift('limited', day(3), 'early');
    const violations = constraint.check(s);
    expect(violations).toHaveLength(1);
    expect(violations[0].constraintType).toBe(ALLOWED_SHIFT_CONSTRAINT);
    expect(violations[0].staffId).toBe('limited');
    expect(violations[0].days.map((d) => d.key)).toEqual([day(3).key]);
    expect(violations[0].message).toContain('早番');
  });

  test('入れる勤務帯・休み・未定は違反にならない', () => {
    const s = emptySchedule()
      .assignShift('limited', day(1), 'late')
      .assignDayOff('limited', day(2));
    expect(constraint.check(s)).toEqual([]);
  });

  test('絞っていない人は、どの勤務帯に入れても違反にならない', () => {
    const s = emptySchedule().assignShift('free', day(1), 'early');
    expect(constraint.check(s)).toEqual([]);
  });

  test('群に居ない人は判定しない', () => {
    const s = emptySchedule().assignShift('stranger', day(1), 'early');
    expect(constraint.check(s)).toEqual([]);
  });

  test('scope は cell（そのセルにしか依存しない）', () => {
    expect(constraint.scope).toBe('cell');
  });
});

describe('ConstraintSet の可能勤務帯チェック', () => {
  test('既定は入。切り替えられる', () => {
    const set = ConstraintSet.empty('sched-1');
    expect(set.checkAllowedShift).toBe(true);
    const off = set.withCheckAllowedShift(false);
    expect(off.checkAllowedShift).toBe(false);
    expect(ConstraintSet.fromPlain(off.toPlain()).checkAllowedShift).toBe(false);
    expect(set.withCheckAllowedShift(true)).toBe(set);
  });
});
