import {
  MonthlyStaffSchedule,
  Staff,
  StaffMonthlyShiftWish,
  WorkingDay,
  WorkingStaffGroup,
} from '@bublys-org/hotel-shift-puzzle-model';
import {
  monthProgressList,
  monthSummariesOf,
  monthsWithSchedule,
  staffWishRows,
  wishesOfMonth,
  workingStaffOfMonth,
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

/** 勤務表 `id` の群（名簿の人だけ）。勤務表は既定で id と同じ群IDを指す */
const group = (id: string, ...staffIds: string[]) =>
  WorkingStaffGroup.ofRoster(id, staffIds);

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

describe('workingStaffOfMonth（希望を集める相手＝その月に働く人）', () => {
  const roster = [staff('s1', 'A'), staff('s2', 'B'), staff('s3', 'C')];

  test('名簿ではなく群が顔ぶれを決める（勤務表から外した人は落ちる）', () => {
    const staffList = workingStaffOfMonth(
      [schedule(2026, 6, 'sch-6')],
      [group('sch-6', 's1', 's3')], // s2 は勤務表から外した
      roster,
      2026,
      6
    );
    expect(staffList.map((s) => s.id)).toEqual(['s1', 's3']);
  });

  test('並び順は群の順（名簿順ではない。勤務表と見比べられるように）', () => {
    const staffList = workingStaffOfMonth(
      [schedule(2026, 6, 'sch-6')],
      [group('sch-6', 's3', 's1', 's2')],
      roster,
      2026,
      6
    );
    expect(staffList.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  test('勤務表で足した臨時の人も出る（実体は群のメンバーが抱えている）', () => {
    const staffList = workingStaffOfMonth(
      [schedule(2026, 6, 'sch-6')],
      [group('sch-6', 's1').addTemporary(staff('tmp-1', '応援'))],
      roster,
      2026,
      6
    );
    expect(staffList.map((s) => [s.id, s.name])).toEqual([
      ['s1', 'A'],
      ['tmp-1', '応援'],
    ]);
  });

  test('別の月の勤務表は混ざらない', () => {
    const staffList = workingStaffOfMonth(
      [schedule(2026, 6, 'sch-6'), schedule(2026, 7, 'sch-7')],
      [group('sch-6', 's1'), group('sch-7', 's2')],
      roster,
      2026,
      6
    );
    expect(staffList.map((s) => s.id)).toEqual(['s1']);
  });

  test('同じ月に勤務表が2つあれば和集合。順は最初の勤務表の群から', () => {
    const staffList = workingStaffOfMonth(
      [schedule(2026, 6, 'sch-a'), schedule(2026, 6, 'sch-b')],
      [group('sch-a', 's3', 's1'), group('sch-b', 's1', 's2')], // s1 は両方に居る
      roster,
      2026,
      6
    );
    expect(staffList.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  test('群をまだ持たない勤務表は名簿全員（勤務表の行の振る舞いと揃える）', () => {
    const staffList = workingStaffOfMonth(
      [schedule(2026, 6, 'sch-6')],
      [], // 群が無い
      roster,
      2026,
      6
    );
    expect(staffList.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  test('勤務表が無い月は空', () => {
    expect(workingStaffOfMonth([], [], roster, 2026, 6)).toEqual([]);
  });
});

describe('monthProgressList（月一覧の行）', () => {
  const roster = [staff('s1', 'A'), staff('s2', 'B'), staff('s3', 'C')];

  test('月ごとに 回収済み／入力あり の人数を数える', () => {
    const schedules = [schedule(2026, 6, 'sch-6'), schedule(2026, 7, 'sch-7')];
    const groups = [group('sch-6', 's1', 's2', 's3'), group('sch-7', 's1', 's2', 's3')];
    const wishes = [
      filledWish('s1', 2026, 6).submit('2026-05-20T09:03:00.000Z'),
      filledWish('s2', 2026, 6),
      emptyWish('s3', 2026, 6), // 作っただけ＝未入力扱い
      filledWish('s1', 2026, 7),
    ];

    expect(monthProgressList(schedules, groups, roster, wishes)).toEqual([
      { year: 2026, month: 6, collectedCount: 1, startedCount: 2, staffCount: 3 },
      { year: 2026, month: 7, collectedCount: 0, startedCount: 1, staffCount: 3 },
    ]);
  });

  test('分母はその月に働く人の数（名簿の人数ではない）', () => {
    const progress = monthProgressList(
      [schedule(2026, 6, 'sch-6')],
      [group('sch-6', 's1', 's2')], // 名簿は3人だが、働くのは2人
      roster,
      []
    );
    expect(progress[0].staffCount).toBe(2);
  });

  test('その月に働かない人の希望は数えない（外した人の回収済みで埋まらない）', () => {
    const progress = monthProgressList(
      [schedule(2026, 6, 'sch-6')],
      [group('sch-6', 's1')], // s2 は外した
      roster,
      [filledWish('s2', 2026, 6).submit('2026-05-20T09:03:00.000Z')]
    );
    expect(progress[0]).toEqual({
      year: 2026,
      month: 6,
      collectedCount: 0,
      startedCount: 0,
      staffCount: 1,
    });
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
  test('希望がまだ無い人も「未入力」で並ぶ（渡した顔ぶれ全員が対象）', () => {
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

  test('渡した並び順はそのまま（勤務表と見比べられるように）', () => {
    const staffList = [staff('s3', 'C'), staff('s1', 'A'), staff('s2', 'B')];
    expect(staffWishRows(staffList, [], 2026, 6).map((r) => r.staff.id)).toEqual([
      's3',
      's1',
      's2',
    ]);
  });

  /**
   * #159 の本題。勤務表から外した人は行から消え、勤務表で足した臨時の人は行に出る。
   * 画面（ShiftWishStaffList）がこの2つを繋いでいるので、繋いだ形で1本固定する。
   */
  test('群が決めた顔ぶれで組むと、外した人は消え、臨時の人が出る', () => {
    const roster = [staff('s1', 'A'), staff('s2', 'B')];
    const schedules = [schedule(2026, 6, 'sch-6')];
    const groups = [group('sch-6', 's1').addTemporary(staff('tmp-1', '応援'))];

    const rows = staffWishRows(
      workingStaffOfMonth(schedules, groups, roster, 2026, 6),
      [filledWish('s2', 2026, 6), filledWish('tmp-1', 2026, 6)],
      2026,
      6
    );

    expect(rows.map((r) => [r.staff.id, r.status])).toEqual([
      ['s1', 'empty'],   // 働く。まだ聞いていない
      ['tmp-1', 'draft'], // 臨時の人。名簿に居なくても行になる
    ]);
    // s2 は勤務表から外したので、希望が残っていても行に出ない
    expect(rows.some((r) => r.staff.id === 's2')).toBe(false);
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
