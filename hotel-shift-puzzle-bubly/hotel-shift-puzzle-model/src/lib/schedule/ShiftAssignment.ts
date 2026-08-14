/**
 * ShiftAssignment — 勤務割当
 *
 * 「あるスタッフが、ある稼働日に、どうなる予定か」を表す。
 * 割当の値（shift）は次の3通り:
 *   - 勤務帯ID（文字列）  : その勤務帯で出勤
 *   - DAY_OFF            : 休み（出勤しない）
 *   - null               : 未定（まだ決まっていない）
 *
 * state は稼働日をインスタンス（WorkingDay）として保持する。
 * シリアライズ用に、入れ子まで全部 plain な ShiftAssignmentPlain を別途定義する。
 * 不変。
 */
import { WorkingDay, type WorkingDayState } from "./WorkingDay.js";

/**
 * 休みを表す専用の値。
 * 勤務帯ID（文字列）とは区別され、null（未定）とも区別される。
 * Redux/persist に乗せられるよう Symbol ではなく文字列定数にしている。
 */
export const DAY_OFF = "day-off" as const;
export type DayOff = typeof DAY_OFF;

/** 勤務割当の値: 勤務帯ID（出勤） | DAY_OFF（休み） | null（未定） */
export type ShiftValue = string | DayOff | null;

/** state：稼働日はインスタンスで保持する */
export type ShiftAssignmentState = {
  staffId: string;
  day: WorkingDay;
  /** 勤務帯ID | DAY_OFF(休み) | null(未定) */
  shift: ShiftValue;
};

/** シリアライズ用：入れ子まで全部 plain */
export type ShiftAssignmentPlain = {
  staffId: string;
  day: WorkingDayState;
  shift: ShiftValue;
};

export class ShiftAssignment {
  constructor(readonly state: ShiftAssignmentState) {}

  get staffId(): string {
    return this.state.staffId;
  }

  get day(): WorkingDay {
    return this.state.day;
  }

  /** 勤務帯ID | DAY_OFF(休み) | null(未定) */
  get shift(): ShiftValue {
    return this.state.shift;
  }

  /** 休みかどうか */
  get isDayOff(): boolean {
    return this.state.shift === DAY_OFF;
  }

  /** 未定（まだ決まっていない）かどうか */
  get isUndecided(): boolean {
    return this.state.shift === null;
  }

  /** いずれかの勤務帯で出勤予定かどうか */
  get isWorking(): boolean {
    return typeof this.state.shift === "string" && this.state.shift !== DAY_OFF;
  }

  /** 出勤のときの勤務帯ID（休み・未定なら undefined） */
  get shiftId(): string | undefined {
    return this.isWorking ? (this.state.shift as string) : undefined;
  }

  toPlain(): ShiftAssignmentPlain {
    return {
      staffId: this.state.staffId,
      day: this.state.day.state,
      shift: this.state.shift,
    };
  }

  static fromPlain(plain: ShiftAssignmentPlain): ShiftAssignment {
    return new ShiftAssignment({
      staffId: plain.staffId,
      day: new WorkingDay(plain.day),
      shift: plain.shift,
    });
  }
}
