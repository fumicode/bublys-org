import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makeSatisfyLeaderRulesStep } from './satisfyLeaderRulesStep.js';
import { makeResolveAmbiguousLeaderSlotsStep } from './resolveAmbiguousLeaderSlotsStep.js';
import { ShiftLeaderRule } from './ShiftLeaderRule.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

describe('makeSatisfyLeaderRulesStep（責任者制約を満たす）', () => {
  const workShifts = createDefaultWorkShifts(); // 早番 early / 中番 middle / 遅番 late
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));
  const june1 = WorkingDay.of(2026, 6, 1);

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
    });

  const ctxOf = (
    staffIds: string[],
    prefs: Record<string, DecodedWish> = {}
  ): AutoShiftContext => ({
    staffIds,
    shiftIdByName,
    shiftNameById,
    preferenceOf: (staffId, d) => prefs[`${staffId}|${d.key}`] ?? { kind: 'neutral' },
  });

  // 「他に選択肢が無い」ベースラインの検証用に、候補は常に1人だけの単純なルールを使う。
  const soleCandidateRule = new ShiftLeaderRule({
    key: 'early',
    label: '早責',
    shiftName: '早番',
    leaderStaffIds: ['A'],
  });
  const step = makeSatisfyLeaderRulesStep([soleCandidateRule], [soleCandidateRule]);

  test('候補が1人しかいなければ、他に選択肢が無いので即ただちに確定する（連勤上限に達するまで）', () => {
    const result = step.run(emptySchedule(), ctxOf(['A']));

    // 連勤上限（既定5）に達するまでの最初の5日は、他に選択肢が無い＝毎日ただちに確定する
    const days = result.schedule.workingDays().slice(0, 5);
    for (const day of days) {
      expect(result.schedule.getShiftIdFor('A', day)).toBe('early');
    }
    // 候補が常に0人（連勤上限で埋められない）か1人（他に選択肢が無く強制）のどちらかなので、
    // 「選択の余地があって未定のまま残す」ケースは一度も発生しない
    expect(result.ambiguousLeaderSlots ?? []).toEqual([]);
  });

  test('既に満たされている日は触らない', () => {
    const schedule = emptySchedule().assignShift('A', june1, 'early');
    const result = step.run(schedule, ctxOf(['A']));

    // 6/1 は既に充足 → 何もしない（ambiguousLeaderSlots にも積まない）
    expect((result.ambiguousLeaderSlots ?? []).some((s) => s.day.equals(june1))).toBe(false);
    // 候補が1人しかいないので、この場合も「未定のまま残す」ケースは発生しない
    expect(result.ambiguousLeaderSlots ?? []).toEqual([]);
  });

  test('休み希望・人間入力は尊重して埋められないこともある', () => {
    // A は 6/1 休み確定 → 候補が0人（埋められない）。ambiguousLeaderSlots には積まない
    // （「候補はいるが選べない」曖昧さとは違う、「そもそも埋められない」ケースなので）。
    const schedule = emptySchedule().assignDayOff('A', june1);
    const result = step.run(schedule, ctxOf(['A']));

    expect(result.schedule.getShiftIdFor('A', june1)).toBeUndefined();
    expect((result.ambiguousLeaderSlots ?? []).some((s) => s.day.equals(june1))).toBe(false);
  });

  test('候補が必要人数より多く残っていれば、他ルールとの兼ね合いが無くても確定させず ambiguousLeaderSlots に記録する', () => {
    // A・B どちらでもよい（他のルールは無い）→「本当に選択の余地がある」ので、
    // このステップだけでは確定しない（3案生成に委ねる）。
    const rule = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['A', 'B'],
    });
    const result = makeSatisfyLeaderRulesStep([rule], [rule]).run(
      emptySchedule(),
      ctxOf(['A', 'B'])
    );

    expect(result.assigned).toBe(0);
    const days = result.schedule.workingDays();
    expect(result.ambiguousLeaderSlots?.length).toBe(days.length);
    for (const slot of result.ambiguousLeaderSlots ?? []) {
      expect(slot.candidates.sort()).toEqual(['A', 'B']);
      expect(slot.remainingNeed).toBe(1);
    }
  });

  test('残った ambiguousLeaderSlots を resolveAmbiguousLeaderSlotsStep に渡すと確定する（フルパイプラインの整合性）', () => {
    const rule = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['A', 'B'],
    });
    const ctx = ctxOf(['A', 'B']);
    const first = makeSatisfyLeaderRulesStep([rule], [rule]).run(emptySchedule(), ctx);
    const resolved = makeResolveAmbiguousLeaderSlotsStep(
      first.ambiguousLeaderSlots ?? [],
      { phase: 0 }
    ).run(first.schedule, ctx);

    const days = resolved.schedule.workingDays();
    for (const day of days) {
      const aOn = resolved.schedule.getShiftIdFor('A', day) === 'early';
      const bOn = resolved.schedule.getShiftIdFor('B', day) === 'early';
      expect(aOn || bOn).toBe(true);
    }
  });

  test('minCount=2 なら毎日2人入れて満たす（候補もちょうど2人ならhidden set）', () => {
    const rule2 = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['A', 'B'],
      minCount: 2,
    });
    const result = makeSatisfyLeaderRulesStep([rule2], [rule2]).run(
      emptySchedule(),
      ctxOf(['A', 'B'])
    );

    expect(result.schedule.getShiftIdFor('A', june1)).toBe('early');
    expect(result.schedule.getShiftIdFor('B', june1)).toBe('early');
    expect((result.ambiguousLeaderSlots ?? []).some((s) => s.day.equals(june1))).toBe(false);
  });

  test('minCount=2 で候補が3人以上いれば、まだ確定せず ambiguousLeaderSlots に記録する', () => {
    const rule3 = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['A', 'B', 'C'],
      minCount: 2,
    });
    const result = makeSatisfyLeaderRulesStep([rule3], [rule3]).run(
      emptySchedule(),
      ctxOf(['A', 'B', 'C'])
    );
    expect(result.schedule.isUndecided('A', june1)).toBe(true);
    expect(result.schedule.isUndecided('B', june1)).toBe(true);
    expect(result.schedule.isUndecided('C', june1)).toBe(true);
    const slot = (result.ambiguousLeaderSlots ?? []).find((s) => s.day.equals(june1));
    expect(slot).toBeDefined();
    expect(slot?.remainingNeed).toBe(2);
    expect(slot?.candidates.sort()).toEqual(['A', 'B', 'C']);
  });

  test('他ルールが allRules にあっても、候補者が重ならず一意に決まるなら今まで通り強制する', () => {
    const nightRule = new ShiftLeaderRule({
      key: 'night',
      label: '夜責',
      shiftName: '遅番',
      leaderStaffIds: ['C'],
    });
    const result = makeSatisfyLeaderRulesStep(
      [soleCandidateRule],
      [soleCandidateRule, nightRule]
    ).run(emptySchedule(), ctxOf(['A', 'C']));

    expect(result.schedule.getShiftIdFor('A', june1)).toBe('early');
    expect(result.schedule.isUndecided('C', june1)).toBe(true); // 夜責は rules 対象外なので未定のまま
  });

  test('2つのルールの唯一の共通候補を早い者勝ちで奪わず、両方を同日中に満たす（旧バグの再現ケース）', () => {
    // 早責は X・Y、夜責は X のみ。旧アルゴリズム（輪番）なら X が早責に先取りされ夜責が枯れていた。
    const early = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['X', 'Y'],
    });
    const night = new ShiftLeaderRule({
      key: 'night',
      label: '夜責',
      shiftName: '遅番',
      leaderStaffIds: ['X'],
    });
    const result = makeSatisfyLeaderRulesStep([early, night], [early, night]).run(
      emptySchedule(),
      ctxOf(['X', 'Y'])
    );
    // 夜責は X しか候補がいないので X は夜責に回り、早責は Y が担う
    expect(result.schedule.getShiftIdFor('X', june1)).toBe('late');
    expect(result.schedule.getShiftIdFor('Y', june1)).toBe('early');
  });

  test('どちらのルールにも同じ1人しか候補がいなければ、どちらも強制せず ambiguousLeaderSlots に記録する', () => {
    // 早責も夜責も候補は X だけ → 本当に矛盾（1人で2枠は埋められない）。安全側で未定のまま残す。
    const early = new ShiftLeaderRule({
      key: 'early',
      label: '早責',
      shiftName: '早番',
      leaderStaffIds: ['X'],
    });
    const night = new ShiftLeaderRule({
      key: 'night',
      label: '夜責',
      shiftName: '遅番',
      leaderStaffIds: ['X'],
    });
    const result = makeSatisfyLeaderRulesStep([early, night], [early, night]).run(
      emptySchedule(),
      ctxOf(['X'])
    );
    expect(result.schedule.isUndecided('X', june1)).toBe(true);
    const slots = result.ambiguousLeaderSlots ?? [];
    expect(slots.some((s) => s.ruleKey === 'early' && s.day.equals(june1))).toBe(true);
    expect(slots.some((s) => s.ruleKey === 'night' && s.day.equals(june1))).toBe(true);
    for (const s of slots.filter((s) => s.day.equals(june1))) {
      expect(s.candidates).toEqual([]);
      expect(s.fallbackCandidates).toEqual(['X']);
    }
  });
});
