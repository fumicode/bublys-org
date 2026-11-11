/**
 * 旧暦（天保暦の決まりによる太陰太陽暦）の日付を引く。
 *
 * 旧暦の月は表（{@link KYUREKI_MONTHS}、天文計算のスクリプトで作った生成物）で持つ。
 * 表の範囲の外の日は引けない（undefined）。範囲は 2020〜2032年。2033〜2034年は旧暦の月の
 * 決め方に複数の説があり（2033年問題）、決まってから表を伸ばす。
 *
 * 受け取るのは素の年月日。ほかのバブリの日付の型に依存しない（どのバブリからも使えるように）。
 */
import { KYUREKI_MONTHS } from "./kyurekiMonths.js";

/** 新暦（グレゴリオ暦）の日付 */
export type CalendarDate = {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
};

/** 旧暦の日付 */
export type KyurekiDate = {
  /** 1-12 */
  month: number;
  /** 1-30 */
  day: number;
  /** 閏月か */
  leap: boolean;
};

const DAY_MS = 86_400_000;

/** 新暦の日付 → その日の 0 時（UTC）のミリ秒。日数の差を取るためだけに使う */
const utcMs = ({ year, month, day }: CalendarDate): number => Date.UTC(year, month - 1, day);

const keyMs = (key: string): number => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** 表の各月の1日（ミリ秒）。二分探索に使う */
const STARTS = KYUREKI_MONTHS.map(([start]) => keyMs(start));

/** 旧暦の日付。表の範囲の外なら undefined */
export function kyurekiOf(date: CalendarDate): KyurekiDate | undefined {
  const ms = utcMs(date);
  if (ms < STARTS[0] || ms >= STARTS[STARTS.length - 1]) return undefined;
  // ms 以下で最後の月の1日を探す
  let lo = 0;
  let hi = STARTS.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (STARTS[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  const [, month, leap] = KYUREKI_MONTHS[lo];
  if (month === undefined) return undefined;
  return { month, day: Math.round((ms - STARTS[lo]) / DAY_MS) + 1, leap: leap === true };
}

/** 旧暦を引ける範囲（新暦）。最初の日と最後の日 */
export const KYUREKI_RANGE: { first: CalendarDate; last: CalendarDate } = (() => {
  const toDate = (ms: number): CalendarDate => {
    const d = new Date(ms);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  };
  return { first: toDate(STARTS[0]), last: toDate(STARTS[STARTS.length - 1] - DAY_MS) };
})();
