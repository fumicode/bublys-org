import {
  MonthlyStaffSchedule,
  Staff,
  StaffMonthlyShiftWish,
  WorkingDay,
} from '@bublys-org/hotel-shift-puzzle-model';
import {
  monthProgressList,
  monthSummariesOf,
  monthsWithSchedule,
  staffWishRows,
  wishesOfMonth,
} from './shiftWishMonths.js';
import {
  collectedAtLabel,
  shiftWishStatusOf,
} from '../ui/shiftWishStatus.js';
import { DAY_OFF_WISH } from '../ui/shiftWishOptions.js';

const schedule = (year: number, month: number, id = `sch-${year}-${month}`) =>
  MonthlyStaffSchedule.create({ id, storeId: 'store-1', year, month });

const emptyWish = (staffId: string, year: number, month: number) =>
  StaffMonthlyShiftWish.create({ staffId, year, month });

/** 1日ぶんだけ希望を入れた（＝入力あり）希望 */
const filledWish = (staffId: string, year: number, month: number) =>
  emptyWish(staffId, year, month).setPreference(
    WorkingDay.of(year, month, 1),
    DAY_OFF_WISH,
    'want'
  );

const staff = (id: string, name: string) => new Staff({ id, name, department: '' });

describe('monthsWithSchedule（希望を出す月＝勤務表がある月）', () => {
  test('勤務表が無ければ空', () => {
    expect(monthsWithSchedule([])).toEqual([]);
  });

  test('同じ年月の勤務表が複数あっても1つに畳む', () => {
    const months = monthsWithSchedule([
      schedule(2026, 6, 'a'),
      schedule(2026, 6, 'b'),
    ]);
    expect(months).toEqual([{ year: 2026, month: 6 }]);
  });

  test('古い順に並ぶ（年をまたいでも）', () => {
    const months = monthsWithSchedule([
      schedule(2027, 1),
      schedule(2026, 12),
      schedule(2026, 6),
    ]);
    expect(months).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});

describe('shiftWishStatusOf（回収状況）', () => {
  test('希望そのものが無ければ未入力', () => {
    expect(shiftWishStatusOf(undefined)).toBe('empty');
  });

  test('作っただけ（1日も入れていない）なら未入力', () => {
    expect(shiftWishStatusOf(emptyWish('staff-A', 2026, 6))).toBe('empty');
  });

  test('1日でも入っていれば入力あり', () => {
    expect(shiftWishStatusOf(filledWish('staff-A', 2026, 6))).toBe('draft');
  });

  test('回収済みなら回収済み', () => {
    const collected = filledWish('staff-A', 2026, 6).submit('2026-05-20T09:03:00.000Z');
    expect(shiftWishStatusOf(collected)).toBe('collected');
  });

  test('中身が空でも回収済みなら回収済み（希望なしと聞き取った、ということ）', () => {
    const collected = emptyWish('staff-A', 2026, 6).submit('2026-05-20T09:03:00.000Z');
    expect(shiftWishStatusOf(collected)).toBe('collected');
  });
});

describe('wishesOfMonth（その月の希望だけを staffId で引く）', () => {
  test('他の月の希望は混ざらない', () => {
    const map = wishesOfMonth(
      [
        filledWish('staff-A', 2026, 6),
        filledWish('staff-B', 2026, 6),
        filledWish('staff-A', 2026, 7),
      ],
      2026,
      6
    );
    expect([...map.keys()].sort()).toEqual(['staff-A', 'staff-B']);
    expect(map.get('staff-A')?.month).toBe(6);
  });
});

describe('monthProgressList（月一覧の行）', () => {
  test('月ごとに 回収済み／入力あり の人数を数える', () => {
    const schedules = [schedule(2026, 6), schedule(2026, 7)];
    const wishes = [
      filledWish('staff-A', 2026, 6).submit('2026-05-20T09:03:00.000Z'),
      filledWish('staff-B', 2026, 6),
      emptyWish('staff-C', 2026, 6), // 作っただけ＝未入力扱い
      filledWish('staff-A', 2026, 7),
    ];

    expect(monthProgressList(schedules, wishes, 3)).toEqual([
      { year: 2026, month: 6, collectedCount: 1, startedCount: 2, staffCount: 3 },
      { year: 2026, month: 7, collectedCount: 0, startedCount: 1, staffCount: 3 },
    ]);
  });
});

describe('monthSummariesOf（スタッフ詳細の行）', () => {
  test('その人の希望だけを、勤務表がある月ぶん並べる', () => {
    const schedules = [schedule(2026, 6), schedule(2026, 7)];
    const wishes = [
      filledWish('staff-A', 2026, 6),
      filledWish('staff-B', 2026, 7), // 別の人。混ざらない
    ];

    expect(monthSummariesOf(schedules, wishes, 'staff-A')).toEqual([
      { year: 2026, month: 6, status: 'draft', filledDays: 1, collectedAt: null },
      { year: 2026, month: 7, status: 'empty', filledDays: 0, collectedAt: null },
    ]);
  });

  test('回収済みなら回収時刻が入る', () => {
    const at = '2026-05-20T09:03:00.000Z';
    const summaries = monthSummariesOf(
      [schedule(2026, 6)],
      [filledWish('staff-A', 2026, 6).submit(at)],
      'staff-A'
    );
    expect(summaries[0]).toEqual({
      year: 2026,
      month: 6,
      status: 'collected',
      filledDays: 1,
      collectedAt: at,
    });
  });
});

describe('staffWishRows（月別一覧の行）', () => {
  test('希望がまだ無い人も「未入力」で並ぶ（スタッフ全員が対象）', () => {
    const rows = staffWishRows(
      [staff('staff-A', '山田'), staff('staff-B', '鈴木')],
      [filledWish('staff-A', 2026, 6)],
      2026,
      6
    );

    expect(rows.map((r) => [r.staff.id, r.status, r.filledDays])).toEqual([
      ['staff-A', 'draft', 1],
      ['staff-B', 'empty', 0],
    ]);
  });

  test('スタッフの並び順はそのまま（勤務表と見比べられるように）', () => {
    const staffList = [staff('s3', 'C'), staff('s1', 'A'), staff('s2', 'B')];
    expect(staffWishRows(staffList, [], 2026, 6).map((r) => r.staff.id)).toEqual([
      's3',
      's1',
      's2',
    ]);
  });
});

describe('collectedAtLabel（回収時刻の短い表示）', () => {
  test('ローカル時刻で 5/20 18:03 のように出す', () => {
    const iso = new Date(2026, 4, 20, 18, 3).toISOString();
    expect(collectedAtLabel(iso)).toBe('5/20 18:03');
  });

  test('読めない値は空文字', () => {
    expect(collectedAtLabel('not-a-date')).toBe('');
  });
});
