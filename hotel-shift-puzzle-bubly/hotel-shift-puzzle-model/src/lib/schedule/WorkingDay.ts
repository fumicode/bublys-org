/**
 * WorkingDay — 稼働日
 *
 * 「6/1」のような日を、単なる Date ではなく独自の値オブジェクトとして表現する。
 * 年・月・日を保持し、カレンダー演算が必要なときだけ内部で Date を使う。
 * 不変。
 */

export type WorkingDayState = {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
};

export class WorkingDay {
  constructor(readonly state: WorkingDayState) {}

  static of(year: number, month: number, day: number): WorkingDay {
    return new WorkingDay({ year, month, day });
  }

  get year(): number {
    return this.state.year;
  }

  get month(): number {
    return this.state.month;
  }

  get day(): number {
    return this.state.day;
  }

  /** 一意キー・ISO日付 "2026-06-01"（辞書順でソート可能） */
  get key(): string {
    const yyyy = String(this.state.year).padStart(4, "0");
    const mm = String(this.state.month).padStart(2, "0");
    const dd = String(this.state.day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /** "6/1" のような短い表示 */
  get label(): string {
    return `${this.state.month}/${this.state.day}`;
  }

  /** 曜日 0=日 ... 6=土 */
  get weekday(): number {
    return this.toDate().getDay();
  }

  /** カレンダー演算用のローカル Date を返す */
  toDate(): Date {
    return new Date(this.state.year, this.state.month - 1, this.state.day);
  }

  equals(other: WorkingDay): boolean {
    return this.key === other.key;
  }

  /** -1 / 0 / 1 */
  compareTo(other: WorkingDay): number {
    if (this.key < other.key) return -1;
    if (this.key > other.key) return 1;
    return 0;
  }
}
