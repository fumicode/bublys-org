import { MonthlyStaffSchedule } from './MonthlyStaffSchedule.js';
import { WorkingDay } from './WorkingDay.js';
import { createDefaultWorkShifts } from './WorkShift.js';
import { makeMinDayOffStep } from './minDayOffStep.js';
import type { AutoShiftContext, DecodedWish } from './autoShiftStep.js';

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
});
