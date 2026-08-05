/**
 * DateRange — 期間（from..to、両端含む）
 *
 * 「何日から何日まで」を表す値オブジェクト。不変。
 * 割り当て（Assignment）や機械希望（MachineRequest）の期間に使う。
 */
import { WorkingDay } from "./WorkingDay.js";

export type DateRangeState = {
  from: WorkingDay;
  to: WorkingDay;
};

export type DateRangePlain = {
  /** WorkingDay.key */
  from: string;
  /** WorkingDay.key */
  to: string;
};

export class DateRange {
  constructor(readonly state: DateRangeState) {}

  static of(from: WorkingDay, to: WorkingDay): DateRange {
    // from <= to になるよう正規化
    return from.compareTo(to) <= 0
      ? new DateRange({ from, to })
      : new DateRange({ from: to, to: from });
  }

  static single(day: WorkingDay): DateRange {
    return new DateRange({ from: day, to: day });
  }

  get from(): WorkingDay {
    return this.state.from;
  }

  get to(): WorkingDay {
    return this.state.to;
  }

  /** 期間内の日数（両端含む） */
  get lengthDays(): number {
    return this.days().length;
  }

  /** 期間内の日を列挙する（両端含む） */
  days(): WorkingDay[] {
    return WorkingDay.range(this.state.from, this.state.to);
  }

  /** その日が期間に含まれるか */
  contains(day: WorkingDay): boolean {
    return (
      this.state.from.compareTo(day) <= 0 && day.compareTo(this.state.to) <= 0
    );
  }

  /** 期間が重なるか（1日でも共通日があれば true） */
  overlaps(other: DateRange): boolean {
    return (
      this.state.from.compareTo(other.state.to) <= 0 &&
      other.state.from.compareTo(this.state.to) <= 0
    );
  }

  /** other の全日を自分が覆うか */
  covers(other: DateRange): boolean {
    return (
      this.state.from.compareTo(other.state.from) <= 0 &&
      other.state.to.compareTo(this.state.to) <= 0
    );
  }

  /** 開始日を差し替えた新しい期間（to を超えたら to に丸める） */
  withFrom(from: WorkingDay): DateRange {
    return DateRange.of(from, this.state.to);
  }

  /** 終了日を差し替えた新しい期間（from を下回ったら from に丸める） */
  withTo(to: WorkingDay): DateRange {
    return DateRange.of(this.state.from, to);
  }

  equals(other: DateRange): boolean {
    return (
      this.state.from.equals(other.state.from) &&
      this.state.to.equals(other.state.to)
    );
  }

  toPlain(): DateRangePlain {
    return { from: this.state.from.key, to: this.state.to.key };
  }

  static fromPlain(plain: DateRangePlain): DateRange {
    return new DateRange({
      from: WorkingDay.fromKey(plain.from),
      to: WorkingDay.fromKey(plain.to),
    });
  }
}
