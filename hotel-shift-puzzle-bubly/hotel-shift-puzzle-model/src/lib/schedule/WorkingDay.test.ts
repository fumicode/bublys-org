import { WorkingDay } from './WorkingDay.js';

describe('WorkingDay（稼働日）', () => {
  test('年・月・日を保持する独自の値オブジェクト', () => {
    const day = WorkingDay.of(2026, 6, 1);
    expect(day.year).toBe(2026);
    expect(day.month).toBe(6);
    expect(day.day).toBe(1);
  });

  test('key は ISO 日付（ゼロ埋め・辞書順ソート可能）', () => {
    expect(WorkingDay.of(2026, 6, 1).key).toBe('2026-06-01');
    expect(WorkingDay.of(2026, 12, 25).key).toBe('2026-12-25');
  });

  test('label は "6/1" 形式', () => {
    expect(WorkingDay.of(2026, 6, 1).label).toBe('6/1');
  });

  test('equals は年月日が一致すれば true', () => {
    expect(WorkingDay.of(2026, 6, 1).equals(WorkingDay.of(2026, 6, 1))).toBe(true);
    expect(WorkingDay.of(2026, 6, 1).equals(WorkingDay.of(2026, 6, 2))).toBe(false);
  });

  test('compareTo で前後を比較できる', () => {
    const d1 = WorkingDay.of(2026, 6, 1);
    const d2 = WorkingDay.of(2026, 6, 2);
    expect(d1.compareTo(d2)).toBe(-1);
    expect(d2.compareTo(d1)).toBe(1);
    expect(d1.compareTo(d1)).toBe(0);
  });

  test('weekday で曜日を取得できる（2026/6/1 は月曜=1）', () => {
    expect(WorkingDay.of(2026, 6, 1).weekday).toBe(1);
  });
});
