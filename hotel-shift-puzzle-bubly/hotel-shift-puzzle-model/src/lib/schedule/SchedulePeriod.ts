/**
 * SchedulePeriod — 期（勤務表の区切り）
 *
 * 勤務表は「期」で区切る。期は**起点日**から始まる、隙間なく続く日の並び。
 *   - 暦月の期（CalendarMonthPeriod）: 起点は毎月1日、長さはその月の日数（ホテル）
 *   - 4週の期（FourWeekPeriod）     : 起点は店舗の起算日から4週ずつ数えた日、長さは28日（行政）
 *
 * ルールは2つだけ:
 *   1. **期は起点日で見分ける。** 同じ種類で起点日が同じなら同じ期
 *   2. **前の期とは、自分の起点日の前日で終わる期。** 前の勤務表・前の確定版・前の末尾は
 *      すべてこの1つの関係で引く（「月」の引き算をしない）
 *
 * 期を「何月か」に換算することはしない。暦の月で数えたいもの（超過勤務の月上限など）は、
 * 稼働日が持つ暦の年月で日を集めればよく、期の仕組みとはぶつからない。
 *
 * 不変。
 */
import { WorkingDay, type WorkingDayState } from "./WorkingDay.js";

/** シリアライズ用 */
export type SchedulePeriodPlain =
  | { kind: "calendar-month"; year: number; month: number }
  | { kind: "four-week"; start: WorkingDayState };

/** 起点日のキー → その期の稼働日。WorkingDay は不変なので使い回す */
const DAYS_BY_PERIOD = new Map<string, WorkingDay[]>();

export abstract class SchedulePeriod {
  abstract readonly kind: SchedulePeriodPlain["kind"];

  /** 起点日（この期の最初の日） */
  abstract get start(): WorkingDay;

  /** 日数 */
  abstract get length(): number;

  /** 前の期（自分の起点日の前日で終わる期） */
  abstract previous(): SchedulePeriod;

  /** 次の期（自分の最終日の翌日から始まる期） */
  abstract next(): SchedulePeriod;

  /** 人が読む呼び方（例: "2026年6月" / "2026/6/7〜7/4"） */
  abstract get label(): string;

  abstract toPlain(): SchedulePeriodPlain;

  /**
   * 一意キー（種類と起点日で決まる。種類が違えば書式も違うので、種類をまたいでぶつからない）。
   * 確定版の ID（"店舗:キー"）にも使うので、**一度決めたら変えない**。
   */
  abstract get key(): string;

  /**
   * この期の全稼働日（起点日から順に）。
   * 制約チェックは何千回も呼ぶので、期ごとに作った WorkingDay を使い回す
   * （配列は呼び出し側が触れるよう毎回複製する）。
   */
  days(): WorkingDay[] {
    let days = DAYS_BY_PERIOD.get(this.key);
    if (!days) {
      const start = this.start;
      days = Array.from({ length: this.length }, (_, i) => start.addDays(i));
      DAYS_BY_PERIOD.set(this.key, days);
    }
    return days.slice();
  }

  /** 最終日 */
  get end(): WorkingDay {
    return this.start.addDays(this.length - 1);
  }

  /** その日がこの期に入るか */
  contains(day: WorkingDay): boolean {
    return this.start.compareTo(day) <= 0 && day.compareTo(this.end) <= 0;
  }

  /** その日の翌日からこの期が始まるか（＝その日で終わるものの直後に続くか） */
  startsRightAfter(day: WorkingDay): boolean {
    return this.start.equals(day.addDays(1));
  }

  equals(other: SchedulePeriod): boolean {
    return this.key === other.key;
  }

  static fromPlain(plain: SchedulePeriodPlain): SchedulePeriod {
    switch (plain.kind) {
      case "calendar-month":
        return CalendarMonthPeriod.of(plain.year, plain.month);
      case "four-week":
        return new FourWeekPeriod({ start: new WorkingDay(plain.start) });
    }
  }
}

/** 暦月の期：起点は毎月1日、長さはその月の日数 */
export class CalendarMonthPeriod extends SchedulePeriod {
  readonly kind = "calendar-month" as const;

  constructor(readonly state: { year: number; /** 1-12 */ month: number }) {
    super();
  }

  static of(year: number, month: number): CalendarMonthPeriod {
    return new CalendarMonthPeriod({ year, month });
  }

  get year(): number {
    return this.state.year;
  }

  /** 1-12 */
  get month(): number {
    return this.state.month;
  }

  get start(): WorkingDay {
    return WorkingDay.of(this.state.year, this.state.month, 1);
  }

  /** "2026-06"（期を入れる前からある確定版の ID "店舗:2026-06" と同じ書式） */
  get key(): string {
    return `${this.state.year}-${String(this.state.month).padStart(2, "0")}`;
  }

  get length(): number {
    return new Date(this.state.year, this.state.month, 0).getDate();
  }

  previous(): CalendarMonthPeriod {
    return this.state.month === 1
      ? CalendarMonthPeriod.of(this.state.year - 1, 12)
      : CalendarMonthPeriod.of(this.state.year, this.state.month - 1);
  }

  next(): CalendarMonthPeriod {
    return this.state.month === 12
      ? CalendarMonthPeriod.of(this.state.year + 1, 1)
      : CalendarMonthPeriod.of(this.state.year, this.state.month + 1);
  }

  get label(): string {
    return `${this.state.year}年${this.state.month}月`;
  }

  toPlain(): SchedulePeriodPlain {
    return { kind: "calendar-month", year: this.state.year, month: this.state.month };
  }
}

/** 4週の期の長さ（日） */
export const FOUR_WEEK_PERIOD_DAYS = 28;

/** 4週の期：起点日から28日 */
export class FourWeekPeriod extends SchedulePeriod {
  readonly kind = "four-week" as const;

  constructor(readonly state: { start: WorkingDay }) {
    super();
  }

  /**
   * 起算日から4週ずつ数えたとき、その日を含む期。
   * 起算日より前の日も、起算日から後ろへ4週ずつ戻って数える。
   */
  static containing(anchor: WorkingDay, day: WorkingDay): FourWeekPeriod {
    const offset = day.daysSince(anchor);
    const index = Math.floor(offset / FOUR_WEEK_PERIOD_DAYS);
    return new FourWeekPeriod({ start: anchor.addDays(index * FOUR_WEEK_PERIOD_DAYS) });
  }

  get start(): WorkingDay {
    return this.state.start;
  }

  /** "four-week:2026-06-07" */
  get key(): string {
    return `${this.kind}:${this.state.start.key}`;
  }

  get length(): number {
    return FOUR_WEEK_PERIOD_DAYS;
  }

  previous(): FourWeekPeriod {
    return new FourWeekPeriod({ start: this.state.start.addDays(-FOUR_WEEK_PERIOD_DAYS) });
  }

  next(): FourWeekPeriod {
    return new FourWeekPeriod({ start: this.state.start.addDays(FOUR_WEEK_PERIOD_DAYS) });
  }

  /** "2026/6/7〜7/4"（年をまたぐときは終わりにも年を付ける） */
  get label(): string {
    const s = this.start;
    const e = this.end;
    const endLabel = e.year === s.year ? e.label : `${e.year}/${e.label}`;
    return `${s.year}/${s.label}〜${endLabel}`;
  }

  toPlain(): SchedulePeriodPlain {
    return { kind: "four-week", start: this.state.start.state };
  }
}

// ========== 集約の保存形での期 ==========

/**
 * 集約（勤務表・確定版）の保存形に、期をどう書くか。
 *
 * 暦月の期は、期を入れる前からある `year`/`month` の形で書く。キーも値も前と同じなので、
 * 保存済みのホテルの勤務表と内容ハッシュが一致し続ける（打ち消しスナップが効く）。
 * それ以外の期だけが `period` を書く。
 */
export type PeriodFields =
  | { year: number; month: number; period?: undefined }
  | { period: SchedulePeriodPlain; year?: undefined; month?: undefined };

/** 期 → 保存形の欄（ここ以外で書き分けない） */
export function periodFieldsOf(period: SchedulePeriod): PeriodFields {
  if (period instanceof CalendarMonthPeriod) {
    return { year: period.year, month: period.month };
  }
  return { period: period.toPlain() };
}

/** 保存形の欄 → 期（{@link periodFieldsOf} の逆） */
export function periodFromFields(fields: PeriodFields): SchedulePeriod {
  if (fields.period) return SchedulePeriod.fromPlain(fields.period);
  return CalendarMonthPeriod.of(fields.year as number, fields.month as number);
}
