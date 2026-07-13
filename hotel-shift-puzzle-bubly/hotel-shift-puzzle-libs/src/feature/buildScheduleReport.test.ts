import {
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  WorkingDay,
  MaxConsecutiveWorkdaysConstraint,
  MaxDayOffPerDayConstraint,
} from '@bublys-org/hotel-shift-puzzle-model';
import { buildScheduleReport } from './buildScheduleReport.js';
import { buildScheduleConstraints } from './scheduleConstraints.js';

describe('buildScheduleReport（シフト確定時のレポート計算）', () => {
  const days = Array.from({ length: 6 }, (_, i) => WorkingDay.of(2026, 6, i + 1));
  const [day1, day2, day3, day4, day5, day6] = days;

  const shiftNameById = new Map([
    ['early', '早番'],
    ['mid', '中番'],
    ['late', '遅番'],
  ]);

  const buildSchedule = () =>
    MonthlyStaffSchedule.create({
      id: 'sched-1',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds: ['early', 'mid', 'late'],
    })
      .setRequired(day1, '早番', 1)
      .setRequired(day2, '中番', 2)
      .setRequired(day2, '遅番', 2)
      // staff-A は6連勤（上限5）。かつ6/1は休み希望なのに早番に入っている＝希望との食い違い。
      .assignShift('staff-A', day1, 'early')
      .assignShift('staff-A', day2, 'early')
      .assignShift('staff-A', day3, 'early')
      .assignShift('staff-A', day4, 'early')
      .assignShift('staff-A', day5, 'early')
      .assignShift('staff-A', day6, 'early')
      .assignShift('staff-B', day2, 'mid')
      .assignShift('staff-C', day2, 'late')
      .assignDayOff('staff-D', day2);

  const wishA = StaffMonthlyShiftWish.create({
    staffId: 'staff-A',
    year: 2026,
    month: 6,
  }).setPreference(day1, 'day-off', 'want'); // 6/1 は休みたいが早番に入った＝妥協

  const staffIds = ['staff-A', 'staff-B', 'staff-C', 'staff-D'];

  const buildConstraints = (extra: import('@bublys-org/hotel-shift-puzzle-model').ScheduleConstraint[] = []) =>
    buildScheduleConstraints({
      modelConstraints: [new MaxConsecutiveWorkdaysConstraint(5), ...extra],
      wish: { wishByStaff: new Map([['staff-A', wishA]]), shiftNameById },
    });

  test('#87 スタッフに紐づくルール違反（連勤・希望など）を妥協として検出する', () => {
    const report = buildScheduleReport({
      schedule: buildSchedule(),
      staffIds,
      constraints: buildConstraints(),
    });

    expect(report.compromises).toEqual([
      {
        staffId: 'staff-A',
        label: '連勤',
        dayKeys: days.map((d) => d.key),
        message: '6連勤（上限5連勤）',
      },
      {
        staffId: 'staff-A',
        label: '希望',
        dayKeys: [day1.key],
        message: '希望と異なる割当です（希望: 休み○ ／ 割当: 早番）',
      },
    ]);
  });

  test('責任者不足・休み上限超過など日単位（誰のせいでもない）の違反は妥協に含めない', () => {
    // maxPerDay=0 にすると staff-D の6/2の休みが必ず「休み上限超過」を発生させる（日単位・staffIdなし）
    const report = buildScheduleReport({
      schedule: buildSchedule(),
      staffIds,
      constraints: buildConstraints([new MaxDayOffPerDayConstraint(0)]),
    });

    expect(report.compromises.some((c) => c.label === '休み上限')).toBe(false);
    // 連勤・希望の2件は変わらず含まれる
    expect(report.compromises).toHaveLength(2);
  });

  test('#88 必要人数合計が平均を上回る日だけを繁忙日にする', () => {
    // day1 required=1, day2 required=4 → average=2.5 → busy = day2 のみ
    const report = buildScheduleReport({
      schedule: buildSchedule(),
      staffIds,
      constraints: buildConstraints(),
    });

    expect(report.busyDayContributions).toEqual([
      { dayKey: day2.key, requiredCount: 4, workedStaffIds: ['staff-A', 'staff-B', 'staff-C'] },
    ]);
  });

  test('#89 妥協回数×2 + 繁忙日出勤回数×1 のスコアをスタッフ全員分、降順で返す', () => {
    const report = buildScheduleReport({
      schedule: buildSchedule(),
      staffIds,
      constraints: buildConstraints(),
    });

    // staff-A: 妥協2件(連勤+希望)・繁忙日1回(6/2出勤) → 2*2+1=5
    expect(report.contributionScores).toEqual([
      { staffId: 'staff-A', compromiseCount: 2, busyDayCount: 1, score: 5 },
      { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 1 },
      { staffId: 'staff-C', compromiseCount: 0, busyDayCount: 1, score: 1 },
      { staffId: 'staff-D', compromiseCount: 0, busyDayCount: 0, score: 0 },
    ]);
  });

  test('必要人数が未設定の勤務表では繁忙日を作らない', () => {
    const empty = MonthlyStaffSchedule.create({
      id: 'sched-2',
      storeId: 'store-1',
      year: 2026,
      month: 6,
      workShiftIds: ['early'],
    });
    const report = buildScheduleReport({
      schedule: empty,
      staffIds: [],
      constraints: buildScheduleConstraints({}),
    });
    expect(report.busyDayContributions).toEqual([]);
    expect(report.compromises).toEqual([]);
    expect(report.contributionScores).toEqual([]);
  });
});
