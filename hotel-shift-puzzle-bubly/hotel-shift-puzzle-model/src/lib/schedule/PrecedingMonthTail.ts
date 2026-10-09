/**
 * PrecedingMonthTail — 前月の末尾（月跨ぎのつなぎ）
 *
 * 勤務表は月で区切って作るが、働く人の暮らしは月末で途切れない。前月末から続く連勤も、
 * 前月末日の遅番の翌朝（＝今月1日）も、今月の勤務表が引き受けるべき事実である。
 * そこで「勤務表は、前月の確定版の末尾から続いている」というルールを1つだけ置き、
 * 前月の確定版の末尾数日を**写し取って**今月の勤務表に持たせる。制約はこの末尾と今月を
 * ひと続きの日として読むので、連勤も遅番明けも、何も特別扱いせずに月を跨いで効く。
 *
 * 写し取る（参照で持たない）理由:
 *   - 確定した版は変わらないので、写しても古くならない
 *   - 制約チェックは勤務表の state の写しの上で走る（配置チェックの絞り込み・候補計算の Worker）。
 *     state に入っていれば、外から別のデータを渡す仕組みを作らずに全部へ行き渡る
 *   - 今月の世界線に載るので、時間移動しても「そのときの前提」で違反が再現される
 *
 * 人は staffId で引く。前月と今月で行の並びや顔ぶれが違っても、同じ人の末尾が今月の行へ
 * そのままつながる（並べ替えは表示側が今月の行順で引くだけ）。前月に居ない人は末尾を持たない
 * ＝これまで通り今月1日から数える。前月で抜けた人の末尾は、引かれないだけで害は無い。
 *
 * 勤務帯は**名前**で持つ。勤務帯の定義は勤務表ごとの写しで、改名・削除ができるので、
 * ID だと前月と今月で指すものがずれる。遅番明けのルールも名前で語っている。
 *
 * 前月の確定版で未定のままのセルは記録しない（＝出勤していない扱い。月内の未定と同じ）。
 *
 * 不変。
 */
import { WorkingDay, type WorkingDayState } from "./WorkingDay.js";
// 型だけ（MonthlyStaffSchedule 側がこのクラスを値として使うので、実行時の循環を作らない）
import type { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

/** 末尾の1セルの値：出勤（勤務帯名）／休み。未定はセルごと持たない */
export type PrecedingCellValue =
  | { kind: "work"; shiftName: string }
  | { kind: "day-off" };

/** state：稼働日はインスタンスで保持する */
export type PrecedingCellState = {
  staffId: string;
  day: WorkingDay;
  value: PrecedingCellValue;
};

/** シリアライズ用 */
export type PrecedingCellPlain = {
  staffId: string;
  day: WorkingDayState;
  value: PrecedingCellValue;
};

/** 前月末尾の1セル（スタッフ×前月の日） */
export class PrecedingCell {
  constructor(readonly state: PrecedingCellState) {}

  get staffId(): string {
    return this.state.staffId;
  }

  get day(): WorkingDay {
    return this.state.day;
  }

  get value(): PrecedingCellValue {
    return this.state.value;
  }

  get isWorking(): boolean {
    return this.state.value.kind === "work";
  }

  /** 出勤なら勤務帯名（休みなら undefined） */
  get shiftName(): string | undefined {
    return this.state.value.kind === "work" ? this.state.value.shiftName : undefined;
  }

  toPlain(): PrecedingCellPlain {
    return {
      staffId: this.state.staffId,
      day: { ...this.state.day.state },
      value: { ...this.state.value },
    };
  }

  static fromPlain(plain: PrecedingCellPlain): PrecedingCell {
    return new PrecedingCell({
      staffId: plain.staffId,
      day: new WorkingDay({ ...plain.day }),
      value: { ...plain.value },
    });
  }
}

/** 写し取る日数の下限。表で前月を1週間ぶん並べて人が判断できるように */
export const PRECEDING_TAIL_MIN_DAYS = 7;

/**
 * 何日写し取れば足りるか。連勤の判定には上限と同じ日数があれば足りる
 * （上限 N 日を全部出勤していて、今月1日も出勤なら N+1 連勤＝違反と分かる）。
 */
export const precedingTailLengthFor = (maxConsecutiveWorkdays: number): number =>
  Math.max(PRECEDING_TAIL_MIN_DAYS, maxConsecutiveWorkdays);

export type PrecedingMonthTailState = {
  /** 写し元：前月の確定レポートのID */
  sourceReportId: string;
  /** 写し元が確定した時刻（epoch ms）。分からない古いレポートは undefined */
  confirmedAt?: number;
  /** 写し取った前月の日（暦順。最後が前月の末日） */
  days: WorkingDay[];
  /** 写し取ったセル（出勤・休みのみ。未定は持たない） */
  cells: PrecedingCell[];
};

export type PrecedingMonthTailPlain = {
  sourceReportId: string;
  confirmedAt?: number;
  days: WorkingDayState[];
  cells: PrecedingCellPlain[];
};

export class PrecedingMonthTail {
  constructor(readonly state: PrecedingMonthTailState) {}

  /**
   * 前月の勤務表（確定時点）から、末尾 length 日を写し取る。
   *
   * @param shiftNameOf 前月の勤務帯ID → 勤務帯名（前月の勤務帯セットで引く）。
   *   引けない ID（定義から消えた勤務帯）は ID をそのまま名前として残す
   *   （出勤だったという事実は連勤に効くので落とさない）。
   */
  static capture(params: {
    sourceReportId: string;
    confirmedAt?: number;
    schedule: MonthlyStaffSchedule;
    shiftNameOf: (shiftId: string) => string | undefined;
    length: number;
  }): PrecedingMonthTail {
    const all = params.schedule.workingDays();
    const days = all.slice(Math.max(0, all.length - params.length));
    const cells: PrecedingCell[] = [];
    for (const day of days) {
      for (const { staffId } of params.schedule.assignmentsOn(day)) {
        const a = params.schedule.getAssignment(staffId, day);
        if (a?.isWorking && a.shiftId !== undefined) {
          const shiftName = params.shiftNameOf(a.shiftId) ?? a.shiftId;
          cells.push(new PrecedingCell({ staffId, day, value: { kind: "work", shiftName } }));
        } else if (a?.isDayOff) {
          cells.push(new PrecedingCell({ staffId, day, value: { kind: "day-off" } }));
        }
      }
    }
    return new PrecedingMonthTail({
      sourceReportId: params.sourceReportId,
      confirmedAt: params.confirmedAt,
      days,
      cells,
    });
  }

  get sourceReportId(): string {
    return this.state.sourceReportId;
  }

  get confirmedAt(): number | undefined {
    return this.state.confirmedAt;
  }

  /** 写し取った前月の日（暦順） */
  get days(): WorkingDay[] {
    return this.state.days;
  }

  /** 前月の末日（今月1日の前日）。日が無ければ undefined */
  get lastDay(): WorkingDay | undefined {
    return this.state.days[this.state.days.length - 1];
  }

  /** 写し元の年月（日が無ければ undefined） */
  get yearMonth(): { year: number; month: number } | undefined {
    const last = this.lastDay;
    return last ? { year: last.year, month: last.month } : undefined;
  }

  /**
   * この末尾が (year, month) の**直前**の月末で終わっているか。
   * 前月の末日まで写し取っていないと、間に空白がある＝ひと続きとは言えない。
   */
  directlyPrecedes(year: number, month: number): boolean {
    const last = this.lastDay;
    if (!last) return false;
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const lastDayOfPrev = new Date(prev.year, prev.month, 0).getDate();
    return last.year === prev.year && last.month === prev.month && last.day === lastDayOfPrev;
  }

  private cellIndex?: Map<string, PrecedingCell>;

  /** そのスタッフ×前月の日のセル（未定・写していない日は undefined） */
  cellOf(staffId: string, day: WorkingDay): PrecedingCell | undefined {
    if (!this.cellIndex) {
      this.cellIndex = new Map(this.state.cells.map((c) => [`${c.staffId}:${c.day.key}`, c]));
    }
    return this.cellIndex.get(`${staffId}:${day.key}`);
  }

  /** その日出勤だったか */
  isWorking(staffId: string, day: WorkingDay): boolean {
    return this.cellOf(staffId, day)?.isWorking === true;
  }

  /** その日の勤務帯名（休み・未定なら undefined） */
  shiftNameOn(staffId: string, day: WorkingDay): string | undefined {
    return this.cellOf(staffId, day)?.shiftName;
  }

  /** 前月末日から遡って、何日続けて出勤していたか（今月へ持ち越す連勤日数） */
  trailingWorkdays(staffId: string): number {
    let count = 0;
    for (let i = this.state.days.length - 1; i >= 0; i--) {
      if (!this.isWorking(staffId, this.state.days[i])) break;
      count++;
    }
    return count;
  }

  /** 末尾にセルを持っている人（前月に居た人） */
  staffIds(): string[] {
    return [...new Set(this.state.cells.map((c) => c.staffId))];
  }

  private cachedSignature?: string;

  /** 中身の同一性キー（判定のキャッシュを末尾ごとに分けるため） */
  get signature(): string {
    if (this.cachedSignature === undefined) {
      const parts = [this.state.sourceReportId, ...this.state.days.map((d) => d.key)];
      for (const c of this.state.cells) {
        parts.push(`${c.staffId}@${c.day.key}=${c.shiftName ?? "off"}`);
      }
      this.cachedSignature = parts.join("|");
    }
    return this.cachedSignature;
  }

  toPlain(): PrecedingMonthTailPlain {
    const plain: PrecedingMonthTailPlain = {
      sourceReportId: this.state.sourceReportId,
      days: this.state.days.map((d) => ({ ...d.state })),
      cells: this.state.cells.map((c) => c.toPlain()),
    };
    if (this.state.confirmedAt !== undefined) plain.confirmedAt = this.state.confirmedAt;
    return plain;
  }

  static fromPlain(plain: PrecedingMonthTailPlain): PrecedingMonthTail {
    return new PrecedingMonthTail({
      sourceReportId: plain.sourceReportId,
      confirmedAt: plain.confirmedAt,
      days: plain.days.map((d) => new WorkingDay({ ...d })),
      cells: plain.cells.map((c) => PrecedingCell.fromPlain(c)),
    });
  }
}
