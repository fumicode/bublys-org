import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { RequiredStaffing } from './RequiredStaffing.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { fulfillWishesStep } from './fulfillWishesStep.js';
import { fillDemandStep } from './fillDemandStep.js';
import { AUTO_SHIFT_STEPS } from './autoShiftSteps.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

describe('段階的な自動シフト（AutoShiftStep）', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));

  const day = (d: number) => WorkingDay.of(2026, 6, d);

  const emptySchedule = (required?: RequiredStaffing) =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds: workShifts.map((w) => w.id),
      requiredStaffing: required,
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

  describe('ステップ共通', () => {
    test('すべてのステップが共通型（key/label/description/run）に揃っている', () => {
      for (const step of AUTO_SHIFT_STEPS) {
        expect(typeof step.key).toBe('string');
        expect(typeof step.label).toBe('string');
        expect(typeof step.description).toBe('string');
        expect(typeof step.run).toBe('function');
      }
      // key は一意
      const keys = AUTO_SHIFT_STEPS.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    test('実行順は「希望を叶える」→「必要人数を埋める」', () => {
      expect(AUTO_SHIFT_STEPS.map((s) => s.key)).toEqual(['fulfill-wishes', 'fill-demand']);
    });
  });

  describe('fulfillWishesStep（希望を叶える）', () => {
    test('休みたい希望は休みに確定する', () => {
      const ctx = ctxOf(['s1'], { [`s1|${day(3).key}`]: { kind: 'day-off' } });
      const { schedule, assigned } = fulfillWishesStep.run(emptySchedule(), ctx);
      expect(schedule.isDayOff('s1', day(3))).toBe(true);
      expect(assigned).toBe(1);
    });

    test('特定の勤務帯を1つ希望すればその帯に確定する', () => {
      const ctx = ctxOf(['s1'], { [`s1|${day(5).key}`]: { kind: 'work', shiftId: 'early' } });
      const { schedule } = fulfillWishesStep.run(emptySchedule(), ctx);
      expect(schedule.getShiftIdFor('s1', day(5))).toBe('early');
    });

    test('人間が入力済みのセルは上書きしない', () => {
      const base = emptySchedule().assignShift('s1', day(3), 'late');
      const ctx = ctxOf(['s1'], { [`s1|${day(3).key}`]: { kind: 'day-off' } });
      const { schedule } = fulfillWishesStep.run(base, ctx);
      expect(schedule.getShiftIdFor('s1', day(3))).toBe('late');
    });

    test('曖昧な希望は触らない（未定のまま人間へ）', () => {
      const ctx = ctxOf(['s1'], { [`s1|${day(3).key}`]: { kind: 'ambiguous' } });
      const { schedule } = fulfillWishesStep.run(emptySchedule(), ctx);
      expect(schedule.isUndecided('s1', day(3))).toBe(true);
    });

    test('可能勤務帯でない帯の希望は転記しない', () => {
      const ctx = ctxOf(
        ['s1'],
        { [`s1|${day(5).key}`]: { kind: 'work', shiftId: 'early' } },
        { isAvailable: (_s, shiftId) => shiftId !== 'early' }
      );
      const { schedule } = fulfillWishesStep.run(emptySchedule(), ctx);
      expect(schedule.isUndecided('s1', day(5))).toBe(true);
    });

    test('需要には触れない（必要人数を埋めるのは別ステップ）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
      const ctx = ctxOf(['s1'], {}); // 希望なし
      const { schedule, assigned } = fulfillWishesStep.run(emptySchedule(required), ctx);
      expect(assigned).toBe(0);
      expect(schedule.isUndecided('s1', day(1))).toBe(true);
    });
  });

  describe('fillDemandStep（必要人数を埋める）', () => {
    test('不足している勤務帯を必要人数まで貪欲に埋める', () => {
      // 早番=2人 必要。候補 s1,s2,s3（neutral）→ 2人だけ早番に
      const required = RequiredStaffing.uniform([day(1)], { 早番: 2 });
      const ctx = ctxOf(['s1', 's2', 's3'], {});
      const { schedule, assigned } = fillDemandStep.run(emptySchedule(required), ctx);

      const earlyCount = schedule.countWorkingByShift(day(1)).get('early') ?? 0;
      expect(earlyCount).toBe(2); // 必要人数ちょうど
      expect(assigned).toBe(2);
    });

    test('必要人数を超えては入れない', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
      const ctx = ctxOf(['s1', 's2', 's3'], {});
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(schedule.countWorkingByShift(day(1)).get('early')).toBe(1);
    });

    test('休み希望の人は入れない（休み希望者は neutral でない）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
      // s1 は休み希望。候補は s2 のみ
      const ctx = ctxOf(['s1', 's2'], { [`s1|${day(1).key}`]: { kind: 'day-off' } });
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(schedule.isUndecided('s1', day(1))).toBe(true); // 触らない
      expect(schedule.getShiftIdFor('s2', day(1))).toBe('early');
    });

    test('候補が足りなければ入れられるだけ入れ、残りは未定のまま', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 3 });
      const ctx = ctxOf(['s1'], {}); // 候補1人だけ
      const { schedule, assigned } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(assigned).toBe(1);
      expect(schedule.getShiftIdFor('s1', day(1))).toBe('early');
    });

    test('人間入力済みのセルは触らない（既存割当は需要にカウントされる）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 2 });
      const base = emptySchedule(required).assignShift('s1', day(1), 'early'); // 人間が1人入れた
      const ctx = ctxOf(['s1', 's2'], {});
      const { schedule } = fillDemandStep.run(base, ctx);
      // 既存1 + 自動1 = 2 になり、s2 が追加される
      expect(schedule.countWorkingByShift(day(1)).get('early')).toBe(2);
      expect(schedule.getShiftIdFor('s2', day(1))).toBe('early');
    });

    test('可能勤務帯でない帯には入れない', () => {
      const required = RequiredStaffing.uniform([day(1)], { 遅番: 1 });
      // s1 は遅番に入れない → 埋められず未定
      const ctx = ctxOf(['s1'], {}, { isAvailable: (_s, shiftId) => shiftId !== 'late' });
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(schedule.isUndecided('s1', day(1))).toBe(true);
    });

    test('連勤上限を超える出勤は割り当てない', () => {
      let base = emptySchedule(RequiredStaffing.uniform([day(6)], { 早番: 1 }));
      for (let d = 1; d <= 5; d++) base = base.assignShift('s1', day(d), 'early'); // 5連勤
      const ctx = ctxOf(['s1'], {}, { maxConsecutive: 5 });
      const { schedule } = fillDemandStep.run(base, ctx);
      expect(schedule.isUndecided('s1', day(6))).toBe(true);
    });
  });

  test('2ステップを順に流すと、希望反映→需要充足の合わせ技になる', () => {
    // 早番=1必要。s1 は休み希望、s2 は neutral。
    // 希望ステップで s1=休み、需要ステップで s2=早番 になる。
    const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
    const ctx = ctxOf(['s1', 's2'], { [`s1|${day(1).key}`]: { kind: 'day-off' } });

    const afterWishes = fulfillWishesStep.run(emptySchedule(required), ctx);
    const afterDemand = fillDemandStep.run(afterWishes.schedule, ctx);

    expect(afterDemand.schedule.isDayOff('s1', day(1))).toBe(true);
    expect(afterDemand.schedule.getShiftIdFor('s2', day(1))).toBe('early');
  });
});
