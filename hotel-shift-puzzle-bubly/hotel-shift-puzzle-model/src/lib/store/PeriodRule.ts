/**
 * PeriodRule — 期の決め方（店舗の設定）
 *
 * 店舗が勤務表をどう区切るか。勤務表を作るときに「どの期の勤務表を作れるか」をこれが出す。
 *   - 暦月（CalendarMonthRule）: 毎月1日から月末まで
 *   - 4週（FourWeekRule）      : 起算日（anchor）から4週ずつ。起算日はどの日でもよい（曜日は縛らない）
 *
 * 勤務表は作られたときに自分の期を持つので、あとで店舗の決め方を変えても、
 * すでにある勤務表の期は動かない（決め方は作るときに読むだけ）。
 *
 * 不変。
 */
import { WorkingDay, type WorkingDayState } from "../schedule/WorkingDay.js";
import {
  CalendarMonthPeriod,
  FourWeekPeriod,
  type SchedulePeriod,
} from "../schedule/SchedulePeriod.js";

/** シリアライズ用 */
export type PeriodRulePlain =
  | { kind: "calendar-month" }
  | { kind: "four-week"; anchor: WorkingDayState };

export type PeriodRuleKind = PeriodRulePlain["kind"];

export abstract class PeriodRule {
  abstract readonly kind: PeriodRuleKind;

  /** その日を含む期 */
  abstract periodContaining(day: WorkingDay): SchedulePeriod;

  /** 人が読む呼び方（例: "暦月" / "4週（起算日 2026/4/5）"） */
  abstract get label(): string;

  abstract toPlain(): PeriodRulePlain;

  /** その日を含む期と、その前 before 期・後 after 期を古い順に並べる（勤務表を作るときの選択肢） */
  periodsAround(day: WorkingDay, before: number, after: number): SchedulePeriod[] {
    const here = this.periodContaining(day);
    const earlier: SchedulePeriod[] = [];
    let p = here;
    for (let i = 0; i < before; i++) earlier.unshift((p = p.previous()));
    const later: SchedulePeriod[] = [];
    p = here;
    for (let i = 0; i < after; i++) later.push((p = p.next()));
    return [...earlier, here, ...later];
  }

  equals(other: PeriodRule): boolean {
    return JSON.stringify(this.toPlain()) === JSON.stringify(other.toPlain());
  }

  static calendarMonth(): CalendarMonthRule {
    return new CalendarMonthRule();
  }

  static fourWeek(anchor: WorkingDay): FourWeekRule {
    return new FourWeekRule({ anchor });
  }

  static fromPlain(plain: PeriodRulePlain): PeriodRule {
    switch (plain.kind) {
      case "calendar-month":
        return PeriodRule.calendarMonth();
      case "four-week":
        return PeriodRule.fourWeek(new WorkingDay(plain.anchor));
    }
  }
}

/** 暦月：毎月1日から月末まで */
export class CalendarMonthRule extends PeriodRule {
  readonly kind = "calendar-month" as const;

  periodContaining(day: WorkingDay): SchedulePeriod {
    return CalendarMonthPeriod.of(day.year, day.month);
  }

  get label(): string {
    return "暦月";
  }

  toPlain(): PeriodRulePlain {
    return { kind: "calendar-month" };
  }
}

/** 4週：起算日から4週ずつ */
export class FourWeekRule extends PeriodRule {
  readonly kind = "four-week" as const;

  constructor(readonly state: { anchor: WorkingDay }) {
    super();
  }

  /** 起算日（ここから4週ずつ数える） */
  get anchor(): WorkingDay {
    return this.state.anchor;
  }

  periodContaining(day: WorkingDay): SchedulePeriod {
    return FourWeekPeriod.containing(this.state.anchor, day);
  }

  get label(): string {
    const a = this.state.anchor;
    return `4週（起算日 ${a.year}/${a.label}）`;
  }

  toPlain(): PeriodRulePlain {
    return { kind: "four-week", anchor: this.state.anchor.state };
  }
}
