import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { RequiredStaffing } from './RequiredStaffing.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { ConstraintSet } from './ConstraintSet.js';
import { ConstraintViolation } from './ConstraintViolation.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import { fulfillWishesStep } from './fulfillWishesStep.js';
import { fillDemandStep } from './fillDemandStep.js';
import { fillDemandBalancedStep } from './fillDemandBalancedStep.js';
import { makeSatisfyLeaderRulesStep } from './satisfyLeaderRulesStep.js';
import { makeResolveAmbiguousLeaderSlotsStep } from './resolveAmbiguousLeaderSlotsStep.js';
import { makeMinDayOffStep } from './minDayOffStep.js';
import type { AutoShiftContext, AutoShiftStep, DecodedWish } from './autoShiftStep.js';
import type { ScheduleConstraint } from './ScheduleConstraint.js';

/**
 * 自動シフトの全ステップが、勤務表の制約リストを守る（#161）。
 *
 * ステップは制約の中身を知らない。制約リストに入っていれば、遅番明けも、
 * これから足す制約も、置くたびに「新しい違反が出ないか」で守られる。
 */
describe('自動シフトは勤務表の制約を守る', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));
  const shiftIdsOf = (name: string) =>
    workShifts.filter((w) => w.name === name).map((w) => w.id);
  const day = (d: number) => WorkingDay.of(2026, 6, d);

  const emptySchedule = (required?: RequiredStaffing) =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      requiredStaffing: required,
    });

  const ctxOf = (
    staffIds: string[],
    constraints: ScheduleConstraint[],
    prefs: Record<string, DecodedWish> = {}
  ): AutoShiftContext => ({
    staffIds,
    shiftIdByName,
    shiftNameById,
    preferenceOf: (staffId, d) => prefs[`${staffId}|${d.key}`] ?? { kind: 'neutral' },
    constraints,
  });

  /** 既定の勤務間インターバル：遅番の翌日は早番・中番に入れない */
  const lateAfter = ConstraintSet.empty('sched-1').intervalConstraints(shiftIdsOf);

  describe('遅番明け', () => {
    test('希望を叶える：遅番の翌日の早番希望は入れず、未定のまま残して件数を知らせる', () => {
      const base = emptySchedule().assignShift('s1', day(1), 'late');
      const ctx = ctxOf(['s1'], lateAfter, {
        [`s1|${day(2).key}`]: { kind: 'work', shiftId: 'early' },
        [`s1|${day(3).key}`]: { kind: 'day-off' },
      });

      const result = fulfillWishesStep.run(base, ctx);

      expect(result.schedule.isUndecided('s1', day(2))).toBe(true);
      expect(result.schedule.isDayOff('s1', day(3))).toBe(true); // ぶつからない希望は入る
      expect(result.message).toContain('1件の希望は入れずに残しました');
    });

    test.each<[string, AutoShiftStep]>([
      ['早番から順に', fillDemandStep],
      ['まんべんなく', fillDemandBalancedStep],
    ])('必要人数を埋める（%s）：遅番の翌日に早番・中番を入れない', (_label, step) => {
      const base = emptySchedule(RequiredStaffing.uniform([day(2)], { 早番: 1, 中番: 1 }))
        .assignShift('s1', day(1), 'late');

      const { schedule } = step.run(base, ctxOf(['s1'], lateAfter));

      expect(schedule.getShiftIdFor('s1', day(2))).not.toBe('early');
      expect(schedule.getShiftIdFor('s1', day(2))).not.toBe('middle');
      expect(schedule.checkConstraints(lateAfter)).toEqual([]);
    });

    test('責任者を満たす：前日に遅番の責任者は早責に入れず、もう一人に決まる', () => {
      const rule = new ShiftLeaderRule({
        key: 'early',
        label: '早責',
        shiftName: '早番',
        leaderStaffIds: ['A', 'B'],
      });
      const step = makeSatisfyLeaderRulesStep([rule], [rule]);
      const base = emptySchedule().assignShift('A', day(1), 'late');

      const { schedule } = step.run(base, ctxOf(['A', 'B'], lateAfter));

      // 制約を見なければ A と B の2択で決め切れない日。A が入れないので B に決まる
      expect(schedule.getShiftIdFor('B', day(2))).toBe('early');
      expect(schedule.isUndecided('A', day(2))).toBe(true);
    });

    test('残った責任者枠を決める：前日に遅番の人は選ばない', () => {
      const step = makeResolveAmbiguousLeaderSlotsStep([
        {
          day: day(2),
          ruleKey: 'early',
          shiftId: 'early',
          remainingNeed: 1,
          candidates: ['A', 'B'], // phase 0 なら A を選ぶ並び
          fallbackCandidates: ['A', 'B'],
        },
      ]);
      const base = emptySchedule().assignShift('A', day(1), 'late');

      const { schedule } = step.run(base, ctxOf(['A', 'B'], lateAfter));

      expect(schedule.isUndecided('A', day(2))).toBe(true);
      expect(schedule.getShiftIdFor('B', day(2))).toBe('early');
    });
  });

  /**
   * ★ ステップが知らない制約でも、制約リストに入れるだけで守られる。
   * 今後制約を足したとき、自動シフトを書き換えなくても効くことをここで固定する。
   */
  describe('★ 今後足す制約も、制約リストに入れるだけで効く', () => {
    /** テスト用の、どのステップも名前を知らない制約：「s1 はその日は出勤しない／休まない」 */
    const noCellOn = (kind: 'work' | 'day-off', d: WorkingDay): ScheduleConstraint => ({
      type: `test-no-${kind}`,
      label: 'テスト',
      scope: 'cell',
      describe: () => `s1 は ${d.key} に ${kind} にしない`,
      check: (schedule) => {
        const status = schedule.statusOf('s1', d).kind;
        return status === kind
          ? [new ConstraintViolation({ constraintType: `test-no-${kind}`, staffId: 's1', days: [d], message: 'テスト' })]
          : [];
      },
    });
    const noWorkOn10 = noCellOn('work', day(10));
    const noDayOffOn15 = noCellOn('day-off', day(15));

    test.each<[string, AutoShiftStep]>([
      ['必要人数を埋める（早番から順に）', fillDemandStep],
      ['必要人数を埋める（まんべんなく）', fillDemandBalancedStep],
      [
        '責任者を満たす',
        makeSatisfyLeaderRulesStep(
          [new ShiftLeaderRule({ key: 'early', label: '早責', shiftName: '早番', leaderStaffIds: ['s1'] })],
          []
        ),
      ],
    ])('%s は、出勤させない日に出勤を入れない', (_label, step) => {
      const required = RequiredStaffing.uniform(emptySchedule().workingDays(), { 早番: 1 });

      const { schedule } = step.run(emptySchedule(required), ctxOf(['s1'], [noWorkOn10]));

      expect(schedule.isWorking('s1', day(10))).toBe(false);
      expect(schedule.isWorking('s1', day(9))).toBe(true); // 他の日は普通に入る
    });

    test('希望を叶える は、出勤させない日の出勤希望を入れない', () => {
      const ctx = ctxOf(['s1'], [noWorkOn10], {
        [`s1|${day(10).key}`]: { kind: 'work', shiftId: 'early' },
      });

      const { schedule } = fulfillWishesStep.run(emptySchedule(), ctx);

      expect(schedule.isUndecided('s1', day(10))).toBe(true);
    });

    test('月◯日休む は、休ませない日に休みを置かない', () => {
      // 30日の月に29日休む＝置ける日はほぼ全部。それでも15日だけは置かない
      const { schedule } = makeMinDayOffStep(29).run(emptySchedule(), ctxOf(['s1'], [noDayOffOn15]));

      expect(schedule.isDayOff('s1', day(15))).toBe(false);
      expect(schedule.countDayOffForStaff('s1')).toBe(29);
    });
  });
});
