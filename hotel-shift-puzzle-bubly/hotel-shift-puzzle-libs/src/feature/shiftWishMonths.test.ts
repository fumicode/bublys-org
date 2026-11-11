import {
  CalendarMonthPeriod,
  FourWeekPeriod,
  MonthlyStaffSchedule,
  Staff,
  StaffMonthlyShiftWish,
  WorkingDay,
} from '@bublys-org/hotel-shift-puzzle-model';
import {
  periodProgressList,
  periodSummariesOf,
  periodsWithSchedule,
  staffWishRows,
  wishesOfPeriod,
} from './shiftWishMonths.js';
import {
  collectedAtLabel,
  shiftWishStatusOf,
} from '../ui/shiftWishStatus.js';
import { DAY_OFF_WISH } from '../ui/shiftWishOptions.js';

const schedule = (year: number, month: number, id = `sch-${year}-${month}`) =>
  MonthlyStaffSchedule.create({ id, storeId: 'store-1', period: CalendarMonthPeriod.of(year, month) });

const month = (year: number, m: number) => CalendarMonthPeriod.of(year, m);

const emptyWish = (staffId: string, year: number, m: number) =>
  StaffMonthlyShiftWish.create({ staffId, period: month(year, m) });

/** 1日ぶんだけ希望を入れた（＝入力あり）希望 */
const filledWish = (staffId: string, year: number, m: number) =>
  emptyWish(staffId, year, m).setPreference(
    WorkingDay.of(year, m, 1),
    DAY_OFF_WISH,
    'want'
  );

const staff = (id: string, name: string) => new Staff({ id, name, department: '' });

describe('periodsWithSchedule（希望を出す期＝勤務表がある期）', () => {
  const keys = (periods: { key: string }[]) => periods.map((p) => p.key);

  test('勤務表が無ければ空', () => {
    expect(periodsWithSchedule([])).toEqual([]);
  });

  test('同じ期の勤務表が複数あっても1つに畳む', () => {
    expect(keys(periodsWithSchedule([schedule(2026, 6, 'a'), schedule(2026, 6, 'b')]))).toEqual([
      '2026-06',
    ]);
  });

  test('古い順に並ぶ（年をまたいでも）', () => {
    expect(
      keys(periodsWithSchedule([schedule(2027, 1), schedule(2026, 12), schedule(2026, 6)]))
    ).toEqual(['2026-06', '2026-12', '2027-01']);
  });

  test('4週の期の勤務表も、その期が希望を出す期になる', () => {
    const fourWeek = MonthlyStaffSchedule.create({
      id: 'g',
      storeId: 'gov',
      period: new FourWeekPeriod({ start: WorkingDay.of(2026, 6, 7) }),
    });
    expect(keys(periodsWithSchedule([fourWeek, schedule(2026, 6)]))).toEqual([
      '2026-06',
      'four-week:2026-06-07',
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

describe('wishesOfPeriod（その期の希望だけを staffId で引く）', () => {
  test('他の期の希望は混ざらない', () => {
    const map = wishesOfPeriod(
      [
        filledWish('staff-A', 2026, 6),
        filledWish('staff-B', 2026, 6),
        filledWish('staff-A', 2026, 7),
      ],
      month(2026, 6)
    );
    expect([...map.keys()].sort()).toEqual(['staff-A', 'staff-B']);
    expect(map.get('staff-A')?.period.equals(month(2026, 6))).toBe(true);
  });
});

describe('periodProgressList（期の一覧の行）', () => {
  test('期ごとに 回収済み／入力あり の人数を数える', () => {
    const schedules = [schedule(2026, 6), schedule(2026, 7)];
    const wishes = [
      filledWish('staff-A', 2026, 6).submit('2026-05-20T09:03:00.000Z'),
      filledWish('staff-B', 2026, 6),
      emptyWish('staff-C', 2026, 6), // 作っただけ＝未入力扱い
      filledWish('staff-A', 2026, 7),
    ];

    expect(periodProgressList(schedules, wishes, 3)).toEqual([
      { period: month(2026, 6), collectedCount: 1, startedCount: 2, staffCount: 3 },
      { period: month(2026, 7), collectedCount: 0, startedCount: 1, staffCount: 3 },
    ]);
  });
});

describe('periodSummariesOf（スタッフ詳細の行）', () => {
  test('その人の希望だけを、勤務表がある期ぶん並べる', () => {
    const schedules = [schedule(2026, 6), schedule(2026, 7)];
    const wishes = [
      filledWish('staff-A', 2026, 6),
      filledWish('staff-B', 2026, 7), // 別の人。混ざらない
    ];

    expect(periodSummariesOf(schedules, wishes, 'staff-A')).toEqual([
      { period: month(2026, 6), status: 'draft', filledDays: 1, collectedAt: null },
      { period: month(2026, 7), status: 'empty', filledDays: 0, collectedAt: null },
    ]);
  });

  test('回収済みなら回収時刻が入る', () => {
    const at = '2026-05-20T09:03:00.000Z';
    const summaries = periodSummariesOf(
      [schedule(2026, 6)],
      [filledWish('staff-A', 2026, 6).submit(at)],
      'staff-A'
    );
    expect(summaries[0]).toEqual({
      period: month(2026, 6),
      status: 'collected',
      filledDays: 1,
      collectedAt: at,
    });
  });
});

describe('staffWishRows（期ごとの一覧の行）', () => {
  test('希望がまだ無い人も「未入力」で並ぶ（スタッフ全員が対象）', () => {
    const rows = staffWishRows(
      [staff('staff-A', '山田'), staff('staff-B', '鈴木')],
      [filledWish('staff-A', 2026, 6)],
      month(2026, 6)
    );

    expect(rows.map((r) => [r.staff.id, r.status, r.filledDays])).toEqual([
      ['staff-A', 'draft', 1],
      ['staff-B', 'empty', 0],
    ]);
  });

  test('スタッフの並び順はそのまま（勤務表と見比べられるように）', () => {
    const staffList = [staff('s3', 'C'), staff('s1', 'A'), staff('s2', 'B')];
    expect(staffWishRows(staffList, [], month(2026, 6)).map((r) => r.staff.id)).toEqual([
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
