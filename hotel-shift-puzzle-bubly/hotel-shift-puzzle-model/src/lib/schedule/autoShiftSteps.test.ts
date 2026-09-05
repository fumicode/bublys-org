import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { RequiredStaffing } from './RequiredStaffing.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { fulfillWishesStep } from './fulfillWishesStep.js';
import { fillDemandStep } from './fillDemandStep.js';
import { fillDemandBalancedStep } from './fillDemandBalancedStep.js';
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

    test('実行順は 希望→需要(早番から順に)→需要(まんべんなく)', () => {
      expect(AUTO_SHIFT_STEPS.map((s) => s.key)).toEqual([
        'fulfill-wishes',
        'fill-demand-ordered',
        'fill-demand-balanced',
      ]);
    });

    test('需要充足の2戦略は同じ group で束ねられている（切り替え用）', () => {
      const group = AUTO_SHIFT_STEPS.filter((s) => s.group === 'fill-demand');
      expect(group.map((s) => s.key)).toEqual(['fill-demand-ordered', 'fill-demand-balanced']);
      // 同 group は同じ groupLabel、別の variantLabel を持つ
      expect(new Set(group.map((s) => s.groupLabel))).toEqual(new Set(['必要人数を埋める']));
      expect(group.map((s) => s.variantLabel)).toEqual(['早番から順に', 'まんべんなく']);
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
    test('不足している勤務帯を必要人数まで貪欲に埋める（余った人は空き埋めで入る）', () => {
      // 早番=2人 必要。候補 s1,s2,s3（neutral）→ 2人が需要ぶん。余る1人も空きセルとして埋める。
      const required = RequiredStaffing.uniform([day(1)], { 早番: 2 });
      const ctx = ctxOf(['s1', 's2', 's3'], {});
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);

      const earlyCount = schedule.countWorkingByShift(day(1)).get('early') ?? 0;
      expect(earlyCount).toBeGreaterThanOrEqual(2); // 必要人数は満たす
      for (const s of ['s1', 's2', 's3']) {
        expect(schedule.isUndecided(s, day(1))).toBe(false); // 未定を残さない
      }
    });

    // 需要を満たしたあとに残る人（必要人数を超えるぶん）も、空白のままにせず勤務帯へ入れる。
    test('必要人数を満たしたあと、余った人も空きセルとして埋める（未定を残さない）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
      const ctx = ctxOf(['s1', 's2', 's3'], {});
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      // 1人は需要ぶん、残る2人は空き埋め（入れる帯の先頭＝早番）へ
      expect(schedule.countWorkingByShift(day(1)).get('early')).toBe(3);
      for (const s of ['s1', 's2', 's3']) {
        expect(schedule.isUndecided(s, day(1))).toBe(false);
      }
    });

    test('休み希望の人は入れない（休み希望者は neutral でない）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
      // s1 は休み希望。候補は s2 のみ
      const ctx = ctxOf(['s1', 's2'], { [`s1|${day(1).key}`]: { kind: 'day-off' } });
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(schedule.isUndecided('s1', day(1))).toBe(true); // 触らない
      expect(schedule.getShiftIdFor('s2', day(1))).toBe('early');
    });

    test('候補が足りなければ需要は満たしきれない（入れられるだけ入れる）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 3 });
      const ctx = ctxOf(['s1'], {}); // 候補1人だけ → 3人は無理
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(schedule.countWorkingByShift(day(1)).get('early')).toBe(1);
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

    test('可能勤務帯でない帯には入れない（空き埋めでも入れない）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 遅番: 1 });
      // s1 は遅番に入れない → 遅番の需要は埋まらない。空き埋めでも遅番には入れず、入れる帯へ入る。
      const ctx = ctxOf(['s1'], {}, { isAvailable: (_s, shiftId) => shiftId !== 'late' });
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);
      expect(schedule.countWorkingByShift(day(1)).get('late') ?? 0).toBe(0);
      expect(schedule.getShiftIdFor('s1', day(1))).not.toBe('late');
    });

    test('連勤上限を超える出勤は割り当てない', () => {
      let base = emptySchedule(RequiredStaffing.uniform([day(6)], { 早番: 1 }));
      for (let d = 1; d <= 5; d++) base = base.assignShift('s1', day(d), 'early'); // 5連勤
      const ctx = ctxOf(['s1'], {}, { maxConsecutive: 5 });
      const { schedule } = fillDemandStep.run(base, ctx);
      expect(schedule.isUndecided('s1', day(6))).toBe(true);
    });
  });

  describe('fillDemandBalancedStep（まんべんなく）と早番から順に版の違い', () => {
    test('早番から順に版は手前の帯に偏る（早番満杯・遅番ゼロ）', () => {
      // 早番2・遅番2 必要、候補は s1,s2 の2人（どちらも全帯OK）
      const required = RequiredStaffing.uniform([day(1)], { 早番: 2, 遅番: 2 });
      const ctx = ctxOf(['s1', 's2'], {});
      const { schedule } = fillDemandStep.run(emptySchedule(required), ctx);

      const counts = schedule.countWorkingByShift(day(1));
      expect(counts.get('early')).toBe(2); // 早番に2人吸われる
      expect(counts.get('late') ?? 0).toBe(0); // 遅番は枯れる
    });

    test('まんべんなく版は帯に均等に配る（早番1・遅番1）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 2, 遅番: 2 });
      const ctx = ctxOf(['s1', 's2'], {});
      const { schedule } = fillDemandBalancedStep.run(emptySchedule(required), ctx);

      const counts = schedule.countWorkingByShift(day(1));
      expect(counts.get('early')).toBe(1);
      expect(counts.get('late')).toBe(1);
    });

    test('まんべんなく版は可能勤務帯を考慮し、融通の利かない人を先に充てる', () => {
      // 早番1・遅番1 必要。s1=全帯OK、s2=遅番に入れない。
      // 早番に s1 を入れてしまうと遅番が埋まらない。まんべんなく版は s2→早番, s1→遅番 にする。
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1, 遅番: 1 });
      const ctx = ctxOf(['s1', 's2'], {}, {
        isAvailable: (s, shiftId) => !(s === 's2' && shiftId === 'late'),
      });
      const { schedule } = fillDemandBalancedStep.run(emptySchedule(required), ctx);

      expect(schedule.getShiftIdFor('s2', day(1))).toBe('early');
      expect(schedule.getShiftIdFor('s1', day(1))).toBe('late');
    });

    test('まんべんなく版も大原則は同じ（休み希望は入れない・連勤上限を守る）', () => {
      const required = RequiredStaffing.uniform([day(1)], { 早番: 1 });
      const ctx = ctxOf(['s1', 's2'], { [`s1|${day(1).key}`]: { kind: 'day-off' } });
      const { schedule } = fillDemandBalancedStep.run(emptySchedule(required), ctx);
      expect(schedule.isUndecided('s1', day(1))).toBe(true);
      expect(schedule.getShiftIdFor('s2', day(1))).toBe('early');
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

  // 需要で埋め切ると空きセルが無くなり「月◯日休む」が達成できなくなる。
  // そのため fillDemand 系は ctx.minDayOff があれば先に休みを確保してから埋める。
  describe('必要人数を埋める（休みを先に確保する）', () => {
    const staffIds = ['s1', 's2', 's3'];
    const allDays = Array.from({ length: 30 }, (_, i) => day(i + 1));
    const required = RequiredStaffing.uniform(allDays, { 早番: 1 });

    test('ctx.minDayOff を渡すと、埋める前に各自の休みを確保する（早番から順に版）', () => {
      const ctx = ctxOf(staffIds, {}, { minDayOff: 8, maxDayOffPerDay: 8 });
      const r = fillDemandStep.run(emptySchedule(required), ctx);
      for (const s of staffIds) {
        expect(r.schedule.countDayOffForStaff(s)).toBeGreaterThanOrEqual(8);
      }
    });

    test('まんべんなく版も同じく休みを先に確保する', () => {
      const ctx = ctxOf(staffIds, {}, { minDayOff: 8, maxDayOffPerDay: 8 });
      const r = fillDemandBalancedStep.run(emptySchedule(required), ctx);
      for (const s of staffIds) {
        expect(r.schedule.countDayOffForStaff(s)).toBeGreaterThanOrEqual(8);
      }
    });

    test('休みを確保したうえで需要も埋める（早番は各日1人）', () => {
      const ctx = ctxOf(staffIds, {}, { minDayOff: 8, maxDayOffPerDay: 8 });
      const r = fillDemandStep.run(emptySchedule(required), ctx);
      const filled = allDays.filter(
        (d) => (r.schedule.countWorkingByShift(d).get('early') ?? 0) >= 1
      );
      expect(filled.length).toBe(allDays.length);
    });

    // 需要を満たしても「必要人数を超えるぶんの人」は未定のまま残ってしまう。
    // それも適当な勤務帯へ入れて埋め切る（＝空白セルを残さない）。
    test('需要を満たしたあとの空きセルも埋め切る（未定を残さない）', () => {
      const ctx = ctxOf(staffIds, {}, { minDayOff: 8, maxDayOffPerDay: 8 });
      for (const step of [fillDemandStep, fillDemandBalancedStep]) {
        const r = step.run(emptySchedule(required), ctx);
        const undecided = allDays.flatMap((d) =>
          staffIds.filter((s) => r.schedule.isUndecided(s, d))
        );
        expect(undecided).toEqual([]);
        // 埋め切った結果、各セルは「出勤」か「休み」のどちらかになっている
        for (const d of allDays) {
          for (const s of staffIds) {
            expect(r.schedule.isWorking(s, d) || r.schedule.isDayOff(s, d)).toBe(true);
          }
        }
      }
    });

    test('まんべんなく版の空き埋めは、人数の少ない帯へ散る（早番だけに偏らない）', () => {
      const ctx = ctxOf(staffIds, {}, { minDayOff: 8, maxDayOffPerDay: 8 });
      const r = fillDemandBalancedStep.run(emptySchedule(required), ctx);
      const used = new Set<string>();
      for (const d of allDays) {
        for (const [id, n] of r.schedule.countWorkingByShift(d)) {
          if (n > 0) used.add(id);
        }
      }
      // 早番以外の帯（中番/遅番）にも人が入っている
      expect(used.size).toBeGreaterThan(1);
    });

    test('ctx.minDayOff が無いときは休みを入れない（従来どおりの挙動）', () => {
      const ctx = ctxOf(staffIds);
      const r = fillDemandStep.run(emptySchedule(required), ctx);
      for (const s of staffIds) {
        expect(r.schedule.countDayOffForStaff(s)).toBe(0);
      }
    });
  });
});
