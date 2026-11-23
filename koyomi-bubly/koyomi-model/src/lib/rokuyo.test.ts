import { describe, expect, test } from 'vitest';
import { kyurekiOf, KYUREKI_RANGE } from './kyureki.js';
import { rokuyoOf, ROKUYO } from './rokuyo.js';
import { KYUREKI_MONTHS } from './kyurekiMonths.js';

const d = (year: number, month: number, day: number) => ({ year, month, day });

describe('旧暦', () => {
  test('旧正月（旧暦1月1日）は日本の旧暦（天保暦）の日付', () => {
    const lunarNewYears = [
      d(2020, 1, 25), d(2021, 2, 12), d(2022, 2, 1), d(2023, 1, 22), d(2024, 2, 10),
      d(2025, 1, 29), d(2026, 2, 17), d(2027, 2, 7), d(2028, 1, 27), d(2029, 2, 13),
      d(2030, 2, 3), d(2031, 1, 23), d(2032, 2, 11),
    ];
    for (const date of lunarNewYears) {
      expect(kyurekiOf(date)).toEqual({ month: 1, day: 1, leap: false });
    }
  });

  test('2028年は朔が日本時間の0時12分なので、旧正月は1月27日（中国の春節の1月26日とは違う）', () => {
    expect(kyurekiOf(d(2028, 1, 26))).toEqual({ month: 12, day: 30, leap: false });
    expect(kyurekiOf(d(2028, 1, 27))).toEqual({ month: 1, day: 1, leap: false });
  });

  test('閏月の年（2020年 閏4月・2023年 閏2月・2025年 閏6月・2028年 閏5月・2031年 閏3月）', () => {
    const leaps = KYUREKI_MONTHS.filter(([, , leap]) => leap).map(([start, month]) => [
      start.slice(0, 4),
      month,
    ]);
    expect(leaps).toEqual([
      ['2020', 4],
      ['2023', 2],
      ['2025', 6],
      ['2028', 5],
      ['2031', 3],
    ]);
    expect(kyurekiOf(d(2025, 7, 25))).toEqual({ month: 6, day: 1, leap: true });
  });

  test('旧暦の月は29日か30日', () => {
    for (let i = 0; i + 1 < KYUREKI_MONTHS.length; i++) {
      const days =
        (Date.parse(KYUREKI_MONTHS[i + 1][0]) - Date.parse(KYUREKI_MONTHS[i][0])) / 86_400_000;
      expect([29, 30]).toContain(days);
    }
  });

  test('表の範囲は2020〜2032年を覆い、その外は引けない（2033年問題が片づくまで伸ばさない）', () => {
    expect(KYUREKI_RANGE.first.year).toBeLessThanOrEqual(2019);
    expect(KYUREKI_RANGE.last).toEqual(d(2032, 12, 31));
    expect(kyurekiOf(d(2020, 1, 1))).toBeDefined();
    expect(kyurekiOf(d(2032, 12, 31))).toBeDefined();
    expect(kyurekiOf(d(2033, 1, 1))).toBeUndefined();
    expect(kyurekiOf(d(2019, 1, 1))).toBeUndefined();
  });
});

describe('六曜', () => {
  test('（旧暦の月＋日）% 6 の順に並ぶ', () => {
    expect(ROKUYO.map((r) => r.label)).toEqual(['大安', '赤口', '先勝', '友引', '先負', '仏滅']);
  });

  test('旧暦1月1日は先勝', () => {
    expect(rokuyoOf(d(2026, 2, 17))?.label).toBe('先勝');
    expect(rokuyoOf(d(2028, 1, 27))?.label).toBe('先勝');
  });

  test('市販の暦と合う（2026年元日は大安）', () => {
    expect(rokuyoOf(d(2026, 1, 1))?.label).toBe('大安');
  });

  test('日が進むごとに順に回る（旧暦の月が替わる日だけ飛ぶ）', () => {
    // 2026/1/1 大安 → 1/2 赤口 → 1/3 先勝
    expect(rokuyoOf(d(2026, 1, 2))?.label).toBe('赤口');
    expect(rokuyoOf(d(2026, 1, 3))?.label).toBe('先勝');
  });

  test('範囲の外は出さない', () => {
    expect(rokuyoOf(d(2033, 1, 1))).toBeUndefined();
  });
});
