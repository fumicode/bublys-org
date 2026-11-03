import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makeMinDayOffStep } from './minDayOffStep.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

import { PrecedingMonthTail } from './PrecedingMonthTail.js';
import { MaxConsecutiveWorkdaysConstraint } from './MaxConsecutiveWorkdaysConstraint.js';
import { DayOffStyle } from '../staff/DayOffStyle.js';
describe('makeMinDayOffStep（月◯日休む）', () => {
  const workShifts = createDefaultWorkShifts();
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  const shiftIdByName = new Map(workShifts.map((w) => [w.name, w.id]));
  const day = (d: number) => WorkingDay.of(2026, 6, d);

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

  const step = makeMinDayOffStep(8);

  test('休みが足りない分だけ入れて、月8日休めるようにする', () => {
    const result = step.run(emptySchedule(), ctxOf(['A']));

    expect(result.assigned).toBe(8);
    expect(result.schedule.countDayOffForStaff('A')).toBe(8);
  });

  test('既に休みがある分は数に入れ、不足分だけ足す', () => {
    let schedule = emptySchedule();
    // 既に3日休み（人間入力）
    for (const d of [1, 2, 3]) schedule = schedule.assignDayOff('A', day(d));
    const result = step.run(schedule, ctxOf(['A']));

    // 8 - 3 = 5 件追加
    expect(result.assigned).toBe(5);
    expect(result.schedule.countDayOffForStaff('A')).toBe(8);
  });

  test('既に8日以上休んでいる人は触らない', () => {
    let schedule = emptySchedule();
    for (let d = 1; d <= 8; d++) schedule = schedule.assignDayOff('A', day(d));
    const result = step.run(schedule, ctxOf(['A']));

    expect(result.assigned).toBe(0);
  });

  test('人間入力済みの出勤セルは休みで上書きしない（未定だけ触る）', () => {
    let schedule = emptySchedule();
    // 全日 早番で確定済み → 未定セルが無い
    for (let d = 1; d <= 30; d++) schedule = schedule.assignShift('A', day(d), 'early');
    const result = step.run(schedule, ctxOf(['A']));

    expect(result.assigned).toBe(0);
    expect(result.schedule.countDayOffForStaff('A')).toBe(0);
  });

  test('出勤希望（work）の日は休みにしない', () => {
    // 6月は30日。A は全日「早番がいい」希望 → どこにも休みを入れられない
    const prefs: Record<string, DecodedWish> = {};
    for (let d = 1; d <= 30; d++) prefs[`A|${day(d).key}`] = { kind: 'work', shiftId: 'early' };
    const result = step.run(emptySchedule(), ctxOf(['A'], prefs));

    expect(result.assigned).toBe(0);
  });

  test('maxPerDay: 1日の休み人数が上限を超えない', () => {
    // 3人×各8日休み。1日上限1人 → どの日も休みは1人以下
    const capped = makeMinDayOffStep(8, { maxPerDay: 1 });
    const result = capped.run(emptySchedule(), ctxOf(['A', 'B', 'C']));

    for (const day of result.schedule.workingDays()) {
      expect(result.schedule.countDayOffOn(day)).toBeLessThanOrEqual(1);
    }
  });

  test('phase を変えると別の休み配分（案）になる', () => {
    const p0 = makeMinDayOffStep(8, { phase: 0 }).run(emptySchedule(), ctxOf(['A']));
    const p1 = makeMinDayOffStep(8, { phase: 1 }).run(emptySchedule(), ctxOf(['A']));

    const offDays = (s: ReturnType<typeof emptySchedule>) =>
      s.workingDays().filter((d) => s.isDayOff('A', d)).map((d) => d.key).join(",");
    // どちらも8日休みだが、入る日が違う
    expect(p0.schedule.countDayOffForStaff('A')).toBe(8);
    expect(p1.schedule.countDayOffForStaff('A')).toBe(8);
    expect(offDays(p0.schedule)).not.toBe(offDays(p1.schedule));
  });

  // 「休みでない日」（＝出勤 or 未定）が連続する最長区間の長さ。
  // 未定を出勤で埋めた将来でも連勤が上限を超えないよう、この長さが maxConsecutive 以下であるべき。
  const longestNonOffRun = (
    s: ReturnType<typeof emptySchedule>,
    staffId: string
  ): number => {
    let max = 0;
    let run = 0;
    for (const d of s.workingDays()) {
      if (s.isDayOff(staffId, d)) {
        run = 0;
      } else {
        run += 1;
        if (run > max) max = run;
      }
    }
    return max;
  };

  test('休みを暦全体に散らし、休みでない日が連勤上限(5)より長く続かない', () => {
    // 30日の月に8日休み。空きを全部出勤で埋めても連勤6以上にならない配置になっているべき。
    const result = step.run(emptySchedule(), ctxOf(['A']));

    expect(result.schedule.countDayOffForStaff('A')).toBe(8);
    // 8日休みなら休みでない日の最長連続は 5 以下（＝将来 連勤6 が生まれない）
    expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(5);
  });

  test('スタッフの並び順が後ろの人でも連勤上限(5)を超えない（月末に連勤を残さない）', () => {
    // 旧実装は splitDay のズラしが区間の端に飛んで偏り、並び順 i が大きい人（例: 6人目）で
    // 月末に6連勤が残っていた（山本・小林さんの症状）。全員について最長連続が5以下であるべき。
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const result = step.run(emptySchedule(), ctxOf(ids));

    for (const id of ids) {
      expect(result.schedule.countDayOffForStaff(id)).toBe(8);
      expect(longestNonOffRun(result.schedule, id)).toBeLessThanOrEqual(5);
    }
  });

  test('確定出勤が飛び飛びにあっても、暦全体で連勤上限(5)を超えさせない', () => {
    // 偶数日を早番で確定（＝飛び飛びの出勤）。奇数日は未定で休みを入れられる。
    // 旧実装は「未定セルの添字空間」で均していたため、暦上の連勤（出勤＋未定の連続）を
    // 意識できなかった。新実装は暦の最長連続区間から割るので、奇数日に休みが散って連勤が割れる。
    let schedule = emptySchedule();
    for (let d = 2; d <= 30; d += 2) schedule = schedule.assignShift('A', day(d), 'early');
    const result = step.run(schedule, ctxOf(['A']));

    expect(result.schedule.countDayOffForStaff('A')).toBe(8);
    expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(5);
  });

  describe('前月とつないだとき（月跨ぎ）', () => {
    /** 前月（5月）末に5連勤して終わった確定版 */
    const tail = () => {
      let may = MonthlyStaffSchedule.create({ id: 'may', storeId: 'store-1', year: 2026, month: 5 });
      for (let d = 27; d <= 31; d++) may = may.assignShift('A', WorkingDay.of(2026, 5, d), 'early');
      may = may.assignDayOff('A', WorkingDay.of(2026, 5, 26));
      return PrecedingMonthTail.capture({
        sourceReportId: 'may:n',
        schedule: may,
        shiftNameOf: () => '早番',
        length: 7,
      });
    };

    test('前月末からの連勤を足して区間を割るので、月初に休みが入る', () => {
      const ctx = { ...ctxOf(['A']), constraints: [new MaxConsecutiveWorkdaysConstraint(5)] };
      const result = step.run(emptySchedule().withPrecedingTail(tail()), ctx);

      expect(result.schedule.countDayOffForStaff('A')).toBe(8);
      // 前月末の5連勤に続けて働くと6連勤になる。休みは月初の早いうちに入る
      const firstOff = result.schedule.workingDays().findIndex((d) => result.schedule.isDayOff('A', d));
      expect(firstOff).toBeLessThanOrEqual(1);
    });
  });

  describe('休みの形（連休型）', () => {
    /** 休みが2日続いている組の数 */
    const pairCount = (s: ReturnType<typeof emptySchedule>, staffId: string): number => {
      const days = s.workingDays();
      let n = 0;
      for (let k = 0; k + 1 < days.length; k++) {
        if (s.isDayOff(staffId, days[k]) && s.isDayOff(staffId, days[k + 1])) n++;
      }
      return n;
    };
    /** 休みが3日以上続いているところがあるか */
    const hasTripleOff = (s: ReturnType<typeof emptySchedule>, staffId: string): boolean => {
      const days = s.workingDays();
      return days.some(
        (_, k) =>
          k + 2 < days.length &&
          [0, 1, 2].every((o) => s.isDayOff(staffId, days[k + o]))
      );
    };
    const clusteredCtx = (maxRun?: number) => ({
      ...ctxOf(['A']),
      maxConsecutiveWorkdays: 5,
      dayOffStyleOf: () => DayOffStyle.clustered(maxRun),
    });

    test('4連まで：出勤を4日以内で区切りながら、休みの隣に置いて連休にする', () => {
      const result = step.run(emptySchedule(), clusteredCtx(4));

      expect(result.schedule.countDayOffForStaff('A')).toBe(8);
      expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(4);
      // 区切りの休みの隣に置いて縮めるので、区切りと連休を同じ休みで兼ねられる
      expect(pairCount(result.schedule, 'A')).toBe(3);
      expect(hasTripleOff(result.schedule, 'A')).toBe(false);
    });

    test('5連まで：4連までより連休が増える（4連1休と5連1休の区別）', () => {
      const result = step.run(emptySchedule(), clusteredCtx(5));

      expect(result.schedule.countDayOffForStaff('A')).toBe(8);
      expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(5);
      expect(pairCount(result.schedule, 'A')).toBe(4);
      expect(hasTripleOff(result.schedule, 'A')).toBe(false);
    });

    test('目標は全体の連勤上限を超えない', () => {
      const ctx = { ...clusteredCtx(6), maxConsecutiveWorkdays: 4 };
      const result = step.run(emptySchedule(), ctx);

      expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(4);
    });

    test('分散型は、希望の休みがあっても休みの隣に置かない（連休を作らない）', () => {
      let schedule = emptySchedule();
      for (const d of [4, 12, 20, 27]) schedule = schedule.assignDayOff('A', day(d));
      const result = step.run(schedule, {
        ...ctxOf(['A']),
        maxConsecutiveWorkdays: 5,
        dayOffStyleOf: () => DayOffStyle.spread(),
      });

      expect(result.schedule.countDayOffForStaff('A')).toBe(8);
      expect(pairCount(result.schedule, 'A')).toBe(0);
      expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(5);
    });

    test('分散型でも、連勤上限を超える区間は休みの隣でも割る（上限が先）', () => {
      // 1〜5日は出勤、6日だけ未定、7日は休み → 1〜6日の6連勤を割れるのは休みの隣の6日だけ
      let schedule = emptySchedule().assignDayOff('A', day(7));
      for (let d = 1; d <= 5; d++) schedule = schedule.assignShift('A', day(d), 'early');
      for (let d = 8; d <= 30; d++) schedule = schedule.assignDayOff('A', day(d));
      const result = makeMinDayOffStep(schedule.countDayOffForStaff('A') + 1).run(schedule, {
        ...ctxOf(['A']),
        maxConsecutiveWorkdays: 5,
        dayOffStyleOf: () => DayOffStyle.spread(),
      });

      expect(result.schedule.isDayOff('A', day(6))).toBe(true);
    });

    test('分散型は、連勤上限を超える区間を、両側が上限以内に収まる日で割る', () => {
      // 1〜6日が休み、7〜14日が8連勤（9〜11日は出勤確定、ほかは未定）、15日以降は休み。
      // 置ける休みは1日。真ん中に近い8日で割ると9〜14日の6連勤が残るので、12日で割る
      let schedule = emptySchedule();
      for (let d = 1; d <= 6; d++) schedule = schedule.assignDayOff('A', day(d));
      for (const d of [9, 10, 11]) schedule = schedule.assignShift('A', day(d), 'early');
      for (let d = 15; d <= 30; d++) schedule = schedule.assignDayOff('A', day(d));
      for (const phase of [0, 1, 2]) {
        const result = makeMinDayOffStep(schedule.countDayOffForStaff('A') + 1, { phase }).run(
          schedule,
          { ...ctxOf(['A']), maxConsecutiveWorkdays: 5, dayOffStyleOf: () => DayOffStyle.spread() }
        );
        expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(5);
      }
    });

    test('分散型は連休を狙わない（これまでと同じ置き方）', () => {
      const spread = step.run(emptySchedule(), {
        ...ctxOf(['A']),
        maxConsecutiveWorkdays: 5,
        dayOffStyleOf: () => DayOffStyle.spread(),
      });
      // 休みの形を渡さなければ分散型と同じ
      const plain = step.run(emptySchedule(), { ...ctxOf(['A']), maxConsecutiveWorkdays: 5 });

      expect(pairCount(spread.schedule, 'A')).toBe(0);
      expect(spread.schedule.toPlain()).toEqual(plain.schedule.toPlain());
    });

    test('長すぎる区間は、希望の休みの隣に置いて縮める（区切りと連休を兼ねる）', () => {
      // 希望の休み 4・12・20・27日。5〜11日の7連勤は、11日に置けば12日と連休になり5連以内に収まる
      let schedule = emptySchedule();
      for (const d of [4, 12, 20, 27]) schedule = schedule.assignDayOff('A', day(d));
      const result = step.run(schedule, clusteredCtx(5));

      expect(result.schedule.isDayOff('A', day(11))).toBe(true);
      expect(result.schedule.isDayOff('A', day(10))).toBe(false);
      expect(pairCount(result.schedule, 'A')).toBe(3);
      expect(hasTripleOff(result.schedule, 'A')).toBe(false);
    });

    test('連休にしても、残りの休みで長すぎる区間を区切りきれないなら、連休より区切りを取る', () => {
      // 1〜11日が未定（11連勤）、12日が単発の休み、13日は出勤、14日以降は休み。置ける休みは1日だけ。
      // 11日に置けば12日と連休になるが、1〜10日の10連勤が残る → 真ん中で区切る
      let schedule = emptySchedule().assignDayOff('A', day(12)).assignShift('A', day(13), 'early');
      for (let d = 14; d <= 30; d++) schedule = schedule.assignDayOff('A', day(d));
      const result = makeMinDayOffStep(schedule.countDayOffForStaff('A') + 1).run(
        schedule,
        clusteredCtx(5)
      );

      expect(result.schedule.isDayOff('A', day(11))).toBe(false);
      expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(5);
    });

    test('希望の休みの隣に寄せて連休にする', () => {
      const schedule = emptySchedule().assignDayOff('A', day(10));
      const result = step.run(schedule, clusteredCtx(5));

      expect(
        result.schedule.isDayOff('A', day(9)) || result.schedule.isDayOff('A', day(11))
      ).toBe(true);
    });

    describe('月を跨いでもリセットしない', () => {
      /** 前月（5月）の末尾。lastOff なら末日が単発の休み、そうでなければ末日まで workdays 連勤 */
      const mayTail = (opts: { lastOff: boolean; workdays: number }) => {
        let may = MonthlyStaffSchedule.create({ id: 'may', storeId: 'store-1', year: 2026, month: 5 });
        const lastWork = opts.lastOff ? 30 : 31;
        for (let d = lastWork; d > lastWork - opts.workdays; d--) {
          may = may.assignShift('A', WorkingDay.of(2026, 5, d), 'early');
        }
        may = may.assignDayOff('A', WorkingDay.of(2026, 5, lastWork - opts.workdays));
        if (opts.lastOff) may = may.assignDayOff('A', WorkingDay.of(2026, 5, 31));
        return PrecedingMonthTail.capture({
          sourceReportId: 'may:n',
          schedule: may,
          shiftNameOf: () => '早番',
          length: 7,
        });
      };

      test('前月末日が単発の休みなら、1日目を相方にして連休にする', () => {
        const schedule = emptySchedule().withPrecedingTail(mayTail({ lastOff: true, workdays: 4 }));
        const result = step.run(schedule, clusteredCtx(5));

        expect(result.schedule.isDayOff('A', day(1))).toBe(true);
        expect(result.schedule.isDayOff('A', day(2))).toBe(false); // 3連休にはしない
      });

      test('前月末から続く出勤を足して、目標の日数で区切る', () => {
        // 前月末に3連勤 → 4連までの人は、遅くとも2日目には休む（前月から4連勤まで）
        const schedule = emptySchedule().withPrecedingTail(mayTail({ lastOff: false, workdays: 3 }));
        const result = step.run(schedule, clusteredCtx(4));

        expect(result.schedule.isDayOff('A', day(2))).toBe(true);
        expect(longestNonOffRun(result.schedule, 'A')).toBeLessThanOrEqual(4);
        expect(hasTripleOff(result.schedule, 'A')).toBe(false);
      });
    });
  });
});
