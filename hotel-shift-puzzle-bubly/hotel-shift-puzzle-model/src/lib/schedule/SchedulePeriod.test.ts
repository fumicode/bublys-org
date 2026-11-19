import { describe, expect, test } from 'vitest';
import { WorkingDay } from './WorkingDay.js';
import {
  CalendarMonthPeriod,
  FourWeekPeriod,
  SchedulePeriod,
  periodFieldsOf,
  periodFromFields,
} from './SchedulePeriod.js';
import { MonthlyStaffSchedule, type MonthlyStaffSchedulePlain } from './MonthlyStaffSchedule.js';
import { ConfirmedSchedule, type ConfirmedSchedulePlain } from './ConfirmedSchedule.js';
import { PrecedingMonthTail } from './PrecedingMonthTail.js';

const day = (y: number, m: number, d: number) => WorkingDay.of(y, m, d);
const fourWeek = (y: number, m: number, d: number) => new FourWeekPeriod({ start: day(y, m, d) });

describe('WorkingDay の日の足し引き', () => {
  test('月・年をまたいで進む／戻る', () => {
    expect(day(2026, 1, 31).addDays(1).key).toBe('2026-02-01');
    expect(day(2026, 12, 31).addDays(1).key).toBe('2027-01-01');
    expect(day(2026, 3, 1).addDays(-1).key).toBe('2026-02-28');
    expect(day(2028, 3, 1).addDays(-1).key).toBe('2028-02-29');
  });

  test('daysSince は addDays の逆', () => {
    expect(day(2026, 7, 5).daysSince(day(2026, 6, 7))).toBe(28);
    expect(day(2026, 6, 7).daysSince(day(2026, 7, 5))).toBe(-28);
    expect(day(2027, 1, 1).daysSince(day(2026, 1, 1))).toBe(365);
  });
});

describe('暦月の期', () => {
  test('起点は1日、長さはその月の日数', () => {
    const feb = CalendarMonthPeriod.of(2026, 2);
    expect(feb.start.key).toBe('2026-02-01');
    expect(feb.length).toBe(28);
    expect(feb.end.key).toBe('2026-02-28');
    expect(feb.days().map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    expect(CalendarMonthPeriod.of(2028, 2).length).toBe(29);
  });

  test('前の期・次の期は前月・翌月（年をまたぐ）', () => {
    expect(CalendarMonthPeriod.of(2026, 1).previous().equals(CalendarMonthPeriod.of(2025, 12))).toBe(true);
    expect(CalendarMonthPeriod.of(2026, 12).next().equals(CalendarMonthPeriod.of(2027, 1))).toBe(true);
  });

  test('呼び方は「2026年6月」', () => {
    expect(CalendarMonthPeriod.of(2026, 6).label).toBe('2026年6月');
  });
});

describe('4週の期', () => {
  test('起点日から28日。月をまたいでよい', () => {
    const p = fourWeek(2026, 6, 7);
    expect(p.length).toBe(28);
    expect(p.end.key).toBe('2026-07-04');
    expect(p.contains(day(2026, 6, 30))).toBe(true);
    expect(p.contains(day(2026, 7, 5))).toBe(false);
    expect(p.contains(day(2026, 6, 6))).toBe(false);
  });

  test('前の期は自分の起点日の前日で終わり、次の期は最終日の翌日から始まる（隙間なく続く）', () => {
    const p = fourWeek(2026, 6, 7);
    expect(p.previous().end.key).toBe('2026-06-06');
    expect(p.next().start.key).toBe('2026-07-05');
    expect(p.startsRightAfter(p.previous().end)).toBe(true);
  });

  test('起算日から4週ずつ数えて、その日を含む期を引ける（起算日より前の日も数えられる）', () => {
    const anchor = day(2026, 4, 5); // 日曜日
    expect(FourWeekPeriod.containing(anchor, day(2026, 4, 5)).start.key).toBe('2026-04-05');
    expect(FourWeekPeriod.containing(anchor, day(2026, 5, 2)).start.key).toBe('2026-04-05');
    expect(FourWeekPeriod.containing(anchor, day(2026, 5, 3)).start.key).toBe('2026-05-03');
    expect(FourWeekPeriod.containing(anchor, day(2026, 4, 4)).start.key).toBe('2026-03-08');
  });

  test('日曜起点なら、どの期も日曜に始まり土曜に終わる', () => {
    let p: SchedulePeriod = fourWeek(2026, 4, 5);
    for (let i = 0; i < 13; i++) {
      expect(p.start.weekday).toBe(0);
      expect(p.end.weekday).toBe(6);
      p = p.next();
    }
  });

  test('呼び方は日付の範囲（年をまたぐときは終わりにも年）', () => {
    expect(fourWeek(2026, 6, 7).label).toBe('2026/6/7〜7/4');
    expect(fourWeek(2026, 12, 20).label).toBe('2026/12/20〜2027/1/16');
  });

  test('同じ起点日でも、種類が違えば別の期', () => {
    // 2026-11-01 は日曜日。暦月の期の起点と重なる
    expect(fourWeek(2026, 11, 1).equals(CalendarMonthPeriod.of(2026, 11))).toBe(false);
  });
});

describe('保存形での期', () => {
  test('暦月の期は year/month で書き、period のキーを作らない', () => {
    expect(periodFieldsOf(CalendarMonthPeriod.of(2026, 6))).toStrictEqual({ year: 2026, month: 6 });
  });

  test('4週の期は period で書き、year/month のキーを作らない', () => {
    expect(periodFieldsOf(fourWeek(2026, 6, 7))).toStrictEqual({
      period: { kind: 'four-week', start: { year: 2026, month: 6, day: 7 } },
    });
  });

  test('書いて読むと同じ期に戻る', () => {
    for (const p of [CalendarMonthPeriod.of(2026, 6), fourWeek(2026, 6, 7)]) {
      expect(periodFromFields(periodFieldsOf(p)).equals(p)).toBe(true);
    }
  });
});

describe('ホテルの保存形を変えない（打ち消しスナップを保つ）', () => {
  // 期を入れる前に保存された勤務表・確定版。これがそのまま書き戻されれば内容ハッシュも一致する
  const legacySchedule: MonthlyStaffSchedulePlain = {
    id: 'sched-1',
    storeId: 'store-1',
    year: 2026,
    month: 6,
    workingStaffGroupId: 'sched-1',
    constraintSetId: 'sched-1',
    assignments: [{ staffId: 'A', day: { year: 2026, month: 6, day: 1 }, shift: 'early' }],
    requiredStaffing: { byDay: { '2026-06-01': { 早番: 2 } } },
    precedingTail: {
      source: { scheduleId: 'prev', worldLineNodeId: 'node' },
      confirmedAt: 1,
      days: [{ year: 2026, month: 5, day: 31 }],
      cells: [{ staffId: 'A', day: { year: 2026, month: 5, day: 31 }, value: { kind: 'day-off' } }],
    },
  };

  test('勤務表：読んで書くと、キーの増減もなく元と同じ形になる', () => {
    const schedule = MonthlyStaffSchedule.fromPlain(legacySchedule);
    expect(schedule.period.equals(CalendarMonthPeriod.of(2026, 6))).toBe(true);
    expect(schedule.toPlain()).toStrictEqual(legacySchedule);
  });

  test('確定版：読んで書くと、キーの増減もなく元と同じ形になる', () => {
    const legacyReport = {
      id: 'store-1:2026-06',
      scheduleId: 'sched-1',
      worldLineNodeId: 'node',
      year: 2026,
      month: 6,
      storeId: 'store-1',
      title: '2026年6月',
      compromises: [],
      busyDayContributions: [],
      stars: [],
      considerationNotes: {},
      compromiseWeight: 2,
      busyDayWeight: 1,
    } as ConfirmedSchedulePlain;
    expect(ConfirmedSchedule.fromPlain(legacyReport).toPlain()).toStrictEqual(legacyReport);
  });
});

describe('4週の期の勤務表', () => {
  const schedule = () =>
    MonthlyStaffSchedule.create({ id: 's', storeId: 'gov', period: fourWeek(2026, 6, 7) });

  test('稼働日は期の28日', () => {
    const days = schedule().workingDays();
    expect(days).toHaveLength(28);
    expect(days[0].key).toBe('2026-06-07');
    expect(days[27].key).toBe('2026-07-04');
  });

  test('保存して読み戻すと同じ期の勤務表になる', () => {
    const plain = schedule().assignShift('A', day(2026, 7, 1), 'early').toPlain();
    expect(plain).not.toHaveProperty('year');
    const back = MonthlyStaffSchedule.fromPlain(plain);
    expect(back.period.equals(fourWeek(2026, 6, 7))).toBe(true);
    expect(back.getShiftIdFor('A', day(2026, 7, 1))).toBe('early');
  });

  test('前の期の確定版から末尾を引き継げる（前の期の最終日の翌日が起点日）', () => {
    const prev = MonthlyStaffSchedule.create({ id: 'p', storeId: 'gov', period: fourWeek(2026, 5, 10) });
    const tail = PrecedingMonthTail.capture({
      source: { scheduleId: 'p', worldLineNodeId: 'n' },
      stars: [],
      schedule: prev,
      shiftNameOf: () => undefined,
      length: 7,
    });
    expect(tail.lastDay?.key).toBe('2026-06-06');
    expect(() => schedule().withPrecedingTail(tail)).not.toThrow();
    // 暦月の6月の直前ではない（5/31 で終わっていない）
    expect(tail.directlyPrecedes(CalendarMonthPeriod.of(2026, 6))).toBe(false);
  });

  test('確定版は店舗×期で1つ。前の期の勤務表だけが引き継ぐ', () => {
    const report = ConfirmedSchedule.create({
      scheduleId: 'p',
      worldLineNodeId: 'n',
      period: fourWeek(2026, 5, 10),
      storeId: 'gov',
      compromises: [],
      busyDayContributions: [],
      stars: [],
    });
    expect(report.id).toBe('gov:four-week:2026-05-10');
    expect(report.title).toBe('2026/5/10〜6/6');
    expect(ConfirmedSchedule.precedingIdFor({ storeId: 'gov', period: fourWeek(2026, 6, 7) })).toBe(report.id);
    expect(ConfirmedSchedule.precedingIdFor({ storeId: 'gov', period: fourWeek(2026, 7, 5) })).not.toBe(report.id);
    expect(ConfirmedSchedule.precedingIdFor({ storeId: 'gov', period: CalendarMonthPeriod.of(2026, 6) })).not.toBe(report.id);
  });
});

describe('確定版の ID は期を入れる前と同じ', () => {
  test('暦月の期は "店舗:年-月"', () => {
    expect(ConfirmedSchedule.idFor('store-1', CalendarMonthPeriod.of(2026, 6))).toBe('store-1:2026-06');
    expect(ConfirmedSchedule.precedingIdFor({ storeId: 'store-1', period: CalendarMonthPeriod.of(2026, 1) })).toBe(
      'store-1:2025-12'
    );
  });
});
