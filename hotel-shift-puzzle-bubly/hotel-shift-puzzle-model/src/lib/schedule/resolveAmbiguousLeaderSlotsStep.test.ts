import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makeResolveAmbiguousLeaderSlotsStep } from './resolveAmbiguousLeaderSlotsStep.js';
import type { AmbiguousLeaderSlot, AutoShiftContext, DecodedWish } from './autoShiftStep.js';
import { DayOffStyle } from '../staff/DayOffStyle.js';

describe('makeResolveAmbiguousLeaderSlotsStep（残った責任者枠を決める）', () => {
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

  const slot = (over: Partial<AmbiguousLeaderSlot>): AmbiguousLeaderSlot => ({
    day: june1,
    ruleKey: 'early',
    shiftId: 'early',
    remainingNeed: 1,
    candidates: [],
    fallbackCandidates: [],
    ...over,
  });

  test('除外後candidatesがあればそこからphase順に必要人数だけ選んで確定する', () => {
    const s = slot({ candidates: ['A', 'B', 'C'], fallbackCandidates: ['A', 'B', 'C'] });
    const result = makeResolveAmbiguousLeaderSlotsStep([s], { phase: 0 }).run(
      emptySchedule(),
      ctxOf(['A', 'B', 'C'])
    );
    expect(result.assigned).toBe(1);
    expect(result.schedule.getShiftIdFor('A', june1)).toBe('early');
  });

  test('candidatesが空でもfallbackCandidatesから選ぶ（現実の妥協）', () => {
    const s = slot({ candidates: [], fallbackCandidates: ['A', 'B'] });
    const result = makeResolveAmbiguousLeaderSlotsStep([s], { phase: 0 }).run(
      emptySchedule(),
      ctxOf(['A', 'B'])
    );
    expect(result.assigned).toBe(1);
    expect(result.schedule.getShiftIdFor('A', june1)).toBe('early');
  });

  test('同じ日・同じ人しか要らない2枠が並ぶとき、先に確定した枠がもう一方の候補プールから自然に消える', () => {
    // 同じ日に2つの別ルール（早責・夜責）が両方とも X しか候補がいない、という状況。
    // X は1日に1つの勤務帯にしか入れないので、片方が確定すればもう片方は埋められなくなる。
    const slot1 = slot({ day: june1, ruleKey: 'early', shiftId: 'early', candidates: ['X'], fallbackCandidates: ['X'] });
    const slot2 = slot({ day: june1, ruleKey: 'night', shiftId: 'late', candidates: ['X'], fallbackCandidates: ['X'] });
    const result = makeResolveAmbiguousLeaderSlotsStep([slot1, slot2], { phase: 0 }).run(
      emptySchedule(),
      ctxOf(['X'])
    );
    // X は先に処理される slot1（早番）に確定するので、slot2（遅番）はもう埋められない
    expect(result.schedule.getShiftIdFor('X', june1)).toBe('early');
    expect(result.assigned).toBe(1);
  });

  test('phaseを変えると別の人が選ばれる（世界線の複数案生成の前提）', () => {
    const s = slot({ candidates: ['A', 'B'], fallbackCandidates: ['A', 'B'] });
    const resultPhase0 = makeResolveAmbiguousLeaderSlotsStep([s], { phase: 0 }).run(
      emptySchedule(),
      ctxOf(['A', 'B'])
    );
    const resultPhase1 = makeResolveAmbiguousLeaderSlotsStep([s], { phase: 1 }).run(
      emptySchedule(),
      ctxOf(['A', 'B'])
    );
    const chosenPhase0 = resultPhase0.schedule.getShiftIdFor('A', june1) === 'early' ? 'A' : 'B';
    const chosenPhase1 = resultPhase1.schedule.getShiftIdFor('A', june1) === 'early' ? 'A' : 'B';
    expect(chosenPhase0).not.toBe(chosenPhase1);
  });

  test('候補が誰も残っていなければ何もしない', () => {
    const s = slot({ candidates: [], fallbackCandidates: [] });
    const result = makeResolveAmbiguousLeaderSlotsStep([s], { phase: 0 }).run(
      emptySchedule(),
      ctxOf([])
    );
    expect(result.assigned).toBe(0);
    expect(result.schedule.isUndecided('anyone', june1)).toBe(true);
  });

  describe('休みの形が崩れにくい人から選ぶ', () => {
    const day = (d: number) => WorkingDay.of(2026, 6, d);
    const slotOn = (d: number, ids: string[]) =>
      slot({ day: day(d), candidates: ids, fallbackCandidates: ids });
    const run = (schedule: MonthlyStaffSchedule, s: AmbiguousLeaderSlot, phase: number, extra: Partial<AutoShiftContext> = {}) =>
      makeResolveAmbiguousLeaderSlotsStep([s], { phase }).run(schedule, {
        ...ctxOf(['A', 'B']),
        maxConsecutiveWorkdays: 5,
        ...extra,
      }).schedule;

    test('出勤が続いている人より、続いていない人を選ぶ（どの案でも）', () => {
      // A は 1〜4日に出勤済み。5日を A にすると5連勤、B なら1日目
      let schedule = emptySchedule();
      for (let d = 1; d <= 4; d++) schedule = schedule.assignShift('A', day(d), 'early');
      for (const phase of [0, 1, 2]) {
        expect(run(schedule, slotOn(5, ['A', 'B']), phase).getShiftIdFor('B', day(5))).toBe('early');
      }
    });

    test('出勤の希望で埋まった未定の日も、休めない日として数える', () => {
      // A は 6〜9日が未定だが全部出勤の希望。5日を A にすると休めない日が5日続く
      const prefs: Record<string, DecodedWish> = {};
      for (let d = 6; d <= 9; d++) prefs[`A|${day(d).key}`] = { kind: 'work', shiftId: 'early' };
      const schedule = emptySchedule().assignShift('B', day(4), 'early');
      for (const phase of [0, 1, 2]) {
        const r = run(schedule, slotOn(5, ['A', 'B']), phase, {
          preferenceOf: (id, d) => prefs[`${id}|${d.key}`] ?? { kind: 'neutral' },
        });
        expect(r.getShiftIdFor('B', day(5))).toBe('early');
      }
    });

    test('連休型の人の、単発の休みの隣（連休の相方の日）は取らない', () => {
      const schedule = emptySchedule().assignDayOff('A', day(4)).assignDayOff('B', day(4));
      const r = run(schedule, slotOn(5, ['A', 'B']), 0, {
        dayOffStyleOf: (id) => (id === 'A' ? DayOffStyle.clustered(5) : DayOffStyle.spread()),
      });
      expect(r.getShiftIdFor('B', day(5))).toBe('early');
    });

    test('崩れ方が同じなら、これまで通り案ごとに選ぶ人が変わる', () => {
      const picked = [0, 1].map((phase) =>
        run(emptySchedule(), slotOn(5, ['A', 'B']), phase).getShiftIdFor('A', day(5))
      );
      expect(picked[0]).not.toEqual(picked[1]);
    });
  });
});
