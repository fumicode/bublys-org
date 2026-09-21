import { MonthlyStaffSchedule, type ShiftCell } from './MonthlyStaffSchedule.js';
import { RequiredStaffing } from './RequiredStaffing.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { ConstraintSet } from './ConstraintSet.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import { computeConstraintDelta } from './ConstraintDelta.js';
import { introducesViolation } from './placementCheck.js';
import type { ScheduleConstraint } from './ScheduleConstraint.js';

describe('introducesViolation（そのセルにその値を置くと、新しい違反が出るか）', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const shiftIdsOf = (name: string) =>
    workShifts.filter((w) => w.name === name).map((w) => w.id);
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const early: ShiftCell = { kind: 'work', shiftId: 'early' };
  const middle: ShiftCell = { kind: 'work', shiftId: 'middle' };
  const late: ShiftCell = { kind: 'work', shiftId: 'late' };
  const off: ShiftCell = { kind: 'day-off' };

  const emptySchedule = (required?: RequiredStaffing) =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      requiredStaffing: required,
    });

  /** 遅番明けだけを見る（既定の勤務間インターバル：遅番の翌日は早番・中番に入れない） */
  const lateAfter = ConstraintSet.empty('sched-1').intervalConstraints(shiftIdsOf);

  describe('遅番明け', () => {
    const base = emptySchedule().assignShift('s1', day(1), 'late');

    test('遅番の翌日に早番・中番は置けない', () => {
      expect(introducesViolation(base, lateAfter, 's1', day(2), early)).toBe(true);
      expect(introducesViolation(base, lateAfter, 's1', day(2), middle)).toBe(true);
    });

    test('遅番の翌日でも、遅番と休みは置ける', () => {
      expect(introducesViolation(base, lateAfter, 's1', day(2), late)).toBe(false);
      expect(introducesViolation(base, lateAfter, 's1', day(2), off)).toBe(false);
    });

    test('翌日の早番につながる前日にも、遅番は置けない（前後どちら向きでも見る）', () => {
      const s = emptySchedule().assignShift('s1', day(5), 'early');
      expect(introducesViolation(s, lateAfter, 's1', day(4), late)).toBe(true);
    });

    test('他のスタッフには関係ない', () => {
      expect(introducesViolation(base, lateAfter, 's2', day(2), early)).toBe(false);
    });
  });

  test('「まだ足りない」を表す制約（必要人数・責任者）は、空きを埋めるのを妨げない', () => {
    const required = RequiredStaffing.uniform([day(1)], { 早番: 3 });
    const set = ConstraintSet.empty('sched-1').addRule(
      new ShiftLeaderRule({
        key: 'early',
        label: '早責',
        shiftName: '早番',
        leaderStaffIds: ['L1'],
        minCount: 1,
      })
    );
    const schedule = emptySchedule(required);
    const constraints = set.modelConstraints(shiftIdsOf);

    // 必要人数も責任者も不足したままだが、それは置く前からある違反なので新しい違反ではない
    expect(introducesViolation(schedule, constraints, 's1', day(1), early)).toBe(false);
  });

  /**
   * ★ 制約の scope で勤務表を絞っても、盤面全体で判定したのと同じ答えになる。
   *
   * 絞り込みは重さ対策で、答えを変えてはいけない。制約が宣言した scope を信じて絞るので、
   * ここが崩れると「候補集合では置けるのに自動シフトは避ける」（またはその逆）が静かに起きる。
   */
  test('★ scope で絞った判定は、盤面全体で判定したのと同じ答えになる', () => {
    const staffIds = ['s1', 's2', 's3'];
    const required = RequiredStaffing.uniform(emptySchedule().workingDays(), {
      早番: 1,
      遅番: 1,
    });
    const set = ConstraintSet.empty('sched-1')
      .withMaxConsecutiveWorkdays(3)
      .withMinMonthlyDayOff(12)
      .withMaxDayOffPerDay(1)
      .addRule(
        new ShiftLeaderRule({
          key: 'early',
          label: '早責',
          shiftName: '早番',
          leaderStaffIds: ['s1', 's2'],
          minCount: 1,
        })
      );
    const constraints: ScheduleConstraint[] = set.modelConstraints(shiftIdsOf);

    // 決定的に、出勤・休み・未定が混ざった盤面を作る
    const pattern: (ShiftCell | undefined)[] = [early, late, middle, off, undefined, early, undefined];
    let schedule = emptySchedule(required);
    staffIds.forEach((staffId, i) => {
      for (const d of schedule.workingDays()) {
        const cell = pattern[(d.day + i * 2) % pattern.length];
        if (cell) schedule = schedule.setCell(staffId, d, cell);
      }
    });

    const boardAnswer = (staffId: string, d: WorkingDay, cell: ShiftCell) =>
      computeConstraintDelta(
        schedule.checkConstraints(constraints),
        schedule.setCell(staffId, d, cell).checkConstraints(constraints)
      ).newlyViolated.length > 0;

    let blocked = 0;
    let allowed = 0;
    for (const staffId of staffIds) {
      for (const d of schedule.workingDays()) {
        if (!schedule.isUndecided(staffId, d)) continue;
        for (const cell of [early, middle, late, off]) {
          const expected = boardAnswer(staffId, d, cell);
          expect([staffId, d.key, cell, introducesViolation(schedule, constraints, staffId, d, cell)])
            .toEqual([staffId, d.key, cell, expected]);
          if (expected) blocked++;
          else allowed++;
        }
      }
    }
    // どちらの答えも十分に出る盤面で比べている（恒真にならないように）
    expect(blocked).toBeGreaterThan(10);
    expect(allowed).toBeGreaterThan(10);
  });
});
