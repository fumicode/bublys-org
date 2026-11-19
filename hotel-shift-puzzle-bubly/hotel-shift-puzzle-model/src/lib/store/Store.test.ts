import { describe, expect, test } from 'vitest';
import { WorkingDay } from '../schedule/WorkingDay.js';
import { CalendarMonthPeriod, FourWeekPeriod } from '../schedule/SchedulePeriod.js';
import { PeriodRule, FourWeekRule } from './PeriodRule.js';
import { GOVERNMENT_FORMAT, HOTEL_FORMAT, StoreFormat, sundayOnOrBefore } from './StoreFormat.js';
import { Store } from './Store.js';

const day = (y: number, m: number, d: number) => WorkingDay.of(y, m, d);
// 2026-11-11 は水曜日
const today = day(2026, 11, 11);

describe('期の決め方', () => {
  test('暦月：その日を含む月の期', () => {
    expect(PeriodRule.calendarMonth().periodContaining(today).equals(CalendarMonthPeriod.of(2026, 11))).toBe(true);
  });

  test('4週：起算日から4週ずつ数えた期。起算日はどの曜日でもよい', () => {
    const thursday = day(2026, 4, 2);
    const p = PeriodRule.fourWeek(thursday).periodContaining(day(2026, 5, 1));
    expect(p.equals(new FourWeekPeriod({ start: day(2026, 4, 30) }))).toBe(true);
  });

  test('勤務表を作るときの選択肢：その日を含む期の前後を古い順に', () => {
    const labels = PeriodRule.calendarMonth()
      .periodsAround(today, 1, 2)
      .map((p) => p.label);
    expect(labels).toEqual(['2026年10月', '2026年11月', '2026年12月', '2027年1月']);
  });

  test('保存して読み戻すと同じ決め方', () => {
    for (const rule of [PeriodRule.calendarMonth(), PeriodRule.fourWeek(day(2026, 4, 5))]) {
      expect(PeriodRule.fromPlain(rule.toPlain()).equals(rule)).toBe(true);
    }
  });
});

describe('形態', () => {
  test('ホテルは暦月、行政は今日を含む週の日曜を起算日にした4週が既定', () => {
    expect(HOTEL_FORMAT.defaultRule(today).kind).toBe('calendar-month');
    const gov = GOVERNMENT_FORMAT.defaultRule(today);
    expect(gov).toBeInstanceOf(FourWeekRule);
    expect((gov as FourWeekRule).anchor.key).toBe('2026-11-08');
  });

  test('起算日の初期値：行政は既定の起算日、ホテルは今日を含む週の日曜', () => {
    expect(GOVERNMENT_FORMAT.defaultAnchor(today).key).toBe('2026-11-08');
    expect(HOTEL_FORMAT.defaultAnchor(today).key).toBe('2026-11-08');
    expect(sundayOnOrBefore(day(2026, 11, 8)).key).toBe('2026-11-08');
  });

  test('言葉は形態が持つ', () => {
    expect(HOTEL_FORMAT.storeNoun).toBe('店舗');
    expect(GOVERNMENT_FORMAT.storeNoun).toBe('課');
  });

  test('デプロイの設定（ID の並び）から形態の並びを作る。先頭が既定', () => {
    expect(StoreFormat.listOf('government')).toEqual([GOVERNMENT_FORMAT]);
    expect(StoreFormat.listOf('hotel, government')).toEqual([HOTEL_FORMAT, GOVERNMENT_FORMAT]);
    expect(StoreFormat.listOf('government,hotel,government')).toEqual([GOVERNMENT_FORMAT, HOTEL_FORMAT]);
    // 未設定・知らない ID だけならホテル（公開中のホテル版と同じ）
    expect(StoreFormat.listOf(undefined)).toEqual([HOTEL_FORMAT]);
    expect(StoreFormat.listOf('hospital')).toEqual([HOTEL_FORMAT]);
  });

  test('組織の呼び方：形態が1つならその言葉、混ざるなら「店舗」', () => {
    expect(StoreFormat.nounFor([GOVERNMENT_FORMAT])).toBe('課');
    expect(StoreFormat.nounFor([HOTEL_FORMAT])).toBe('店舗');
    expect(StoreFormat.nounFor([HOTEL_FORMAT, GOVERNMENT_FORMAT])).toBe('店舗');
  });

  test('見つからない形態の ID はホテルとして読む', () => {
    expect(StoreFormat.of('government')).toBe(GOVERNMENT_FORMAT);
    expect(StoreFormat.of('unknown')).toBe(HOTEL_FORMAT);
  });
});

describe('店舗', () => {
  test('作ると、期の決め方は形態の既定になる', () => {
    const s = Store.create({ id: 'g', name: '総務課', format: GOVERNMENT_FORMAT, today });
    expect(s.periodRule.kind).toBe('four-week');
    expect(s.periodContaining(today).start.key).toBe('2026-11-08');
  });

  test('形態を変えても、期の決め方はそのまま（形態は既定値を決めるだけ）', () => {
    const s = Store.create({ id: 'h', name: 'ホテル', format: HOTEL_FORMAT, today }).withFormat(GOVERNMENT_FORMAT);
    expect(s.format).toBe(GOVERNMENT_FORMAT);
    expect(s.periodRule.kind).toBe('calendar-month');
  });

  test('見つからない storeId は、ホテル形態・暦月の店舗として読む', () => {
    const s = Store.resolve([], 'store-1');
    expect(s.id).toBe('store-1');
    expect(s.name).toBe('store-1');
    expect(s.format).toBe(HOTEL_FORMAT);
    expect(s.periodRule.kind).toBe('calendar-month');
  });

  test('削除した店舗は「（削除された店舗）」、一度も記録していない店舗は ID のまま', () => {
    const removed = new Set(['8bf1427a']);
    expect(Store.resolve([], '8bf1427a', removed).name).toBe('（削除された店舗）');
    expect(Store.resolve([], 'store-1', removed).name).toBe('store-1');
    // 記録があれば、削除の印より記録を優先する（同じ ID で作り直した場合）
    const again = Store.create({ id: '8bf1427a', name: '新館', format: HOTEL_FORMAT, today });
    expect(Store.resolve([again], '8bf1427a', removed).name).toBe('新館');
  });

  test('保存して読み戻すと同じ店舗', () => {
    const s = Store.create({ id: 'g', name: '総務課', format: GOVERNMENT_FORMAT, today });
    const plain = s.toPlain();
    expect(plain).toEqual({
      id: 'g',
      name: '総務課',
      formatId: 'government',
      periodRule: { kind: 'four-week', anchor: { year: 2026, month: 11, day: 8 } },
    });
    const back = Store.fromPlain(plain);
    expect(back.format).toBe(GOVERNMENT_FORMAT);
    expect(back.periodRule.equals(s.periodRule)).toBe(true);
  });
});
