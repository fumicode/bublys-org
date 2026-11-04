import {
  ALLOWED_SHIFT_CONSTRAINT,
  ConstraintSet,
  WorkShift,
  WorkingStaffGroup,
  isShiftIntervalConstraintType,
} from '@bublys-org/hotel-shift-puzzle-model';
import { scheduleConstraintsOf } from './scheduleConstraints.js';

/**
 * 勤務表に効く制約リストは1つの関数で組む。違反表示と自動シフトが同じリストを使うため（#161）。
 */
describe('scheduleConstraintsOf（その勤務表に効く制約リスト）', () => {
  const workShifts = [
    WorkShift.of('early', '早番', { hour: 7 }),
    WorkShift.of('late', '遅番', { hour: 15 }),
  ];
  const typesOf = (
    constraintSet: ConstraintSet | undefined,
    staffGroup: WorkingStaffGroup | undefined = undefined
  ) =>
    scheduleConstraintsOf({ constraintSet, workShifts, wishByStaff: new Map(), staffGroup }).map(
      (c) => c.type
    );
  const group = WorkingStaffGroup.ofRoster('sched-1', ['a']);

  test('制約セットの制約（遅番明けを含む）が入る', () => {
    const types = typesOf(ConstraintSet.empty('sched-1'));
    expect(types).toContain('max-consecutive-workdays');
    expect(types.some(isShiftIntervalConstraintType)).toBe(true);
  });

  test('希望チェックが入なら希望との食い違いを足し、切なら足さない', () => {
    const on = ConstraintSet.empty('sched-1').withCheckShiftWish(true);
    const off = ConstraintSet.empty('sched-1').withCheckShiftWish(false);
    expect(typesOf(on)).toHaveLength(typesOf(off).length + 1);
  });

  test('制約セットがまだ読めていないときは、希望チェックだけ（既定の入）', () => {
    expect(typesOf(undefined)).toHaveLength(1);
  });

  test('可能勤務帯チェックが入なら可能勤務帯を足し、切なら足さない（#216）', () => {
    const on = ConstraintSet.empty('sched-1').withCheckAllowedShift(true);
    const off = ConstraintSet.empty('sched-1').withCheckAllowedShift(false);
    expect(typesOf(on, group)).toContain(ALLOWED_SHIFT_CONSTRAINT);
    expect(typesOf(off, group)).not.toContain(ALLOWED_SHIFT_CONSTRAINT);
    // 制約セットがまだ読めていないときは既定の入
    expect(typesOf(undefined, group)).toContain(ALLOWED_SHIFT_CONSTRAINT);
  });

  test('勤務スタッフ群がまだ無い勤務表には、可能勤務帯を足さない', () => {
    expect(typesOf(ConstraintSet.empty('sched-1'))).not.toContain(ALLOWED_SHIFT_CONSTRAINT);
  });
});
