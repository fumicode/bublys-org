/**
 * WorkShift — 勤務帯
 *
 * 勤務帯の名前と、実際の開始時刻を持つ。
 * 例: 早番（7:00）、中番（9:00）、遅番（13:00）。
 * 「休み」は勤務帯ではなく、割当側で DAY_OFF として表現する。
 * 不変。
 *
 * 内部データは 0:00 からの通算分（startMinute）で保持する。
 * 入力は時・分で指定できるよう WorkShift.of(...) を用意している。
 */

/** 時刻（時・分） */
export type TimeOfDay = {
  hour: number;
  minute: number;
};

export type WorkShiftState = {
  id: string;
  name: string;
  /** 開始時刻（0:00 からの通算分）。例: 7:00 → 420 */
  startMinute: number;
};

export class WorkShift {
  constructor(readonly state: WorkShiftState) {}

  /**
   * 勤務帯を作る。開始時刻は時・分で指定する（分は省略可・デフォルト0）。
   * 例: WorkShift.of("early", "早番", { hour: 7 })            // 7:00
   *     WorkShift.of("mid",   "中番", { hour: 9, minute: 30 }) // 9:30
   */
  static of(
    id: string,
    name: string,
    start: { hour: number; minute?: number }
  ): WorkShift {
    return new WorkShift({
      id,
      name,
      startMinute: start.hour * 60 + (start.minute ?? 0),
    });
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  /** 開始時刻（0:00 からの通算分） */
  get startMinute(): number {
    return this.state.startMinute;
  }

  get startHour(): number {
    return Math.floor(this.state.startMinute / 60);
  }

  get startMinuteOfHour(): number {
    return this.state.startMinute % 60;
  }

  /** 開始時刻を時・分で返す */
  get start(): TimeOfDay {
    return { hour: this.startHour, minute: this.startMinuteOfHour };
  }

  /** "7:00" / "9:30" のような開始時刻表示 */
  get startTimeLabel(): string {
    return `${this.startHour}:${String(this.startMinuteOfHour).padStart(2, "0")}`;
  }

  /** 名前を変更した新しい WorkShift を返す */
  rename(name: string): WorkShift {
    return new WorkShift({ ...this.state, name });
  }

  /** 開始時刻を変更した新しい WorkShift を返す（時・分指定、分は省略可） */
  changeStart(start: { hour: number; minute?: number }): WorkShift {
    return new WorkShift({
      ...this.state,
      startMinute: start.hour * 60 + (start.minute ?? 0),
    });
  }
}

/** 例として用意する標準の勤務帯（早番・中番・遅番） */
export function createDefaultWorkShifts(): WorkShift[] {
  return [
    WorkShift.of("early", "早番", { hour: 7 }), // 7:00
    WorkShift.of("middle", "中番", { hour: 9 }), // 9:00
    WorkShift.of("late", "遅番", { hour: 13 }), // 13:00
  ];
}
