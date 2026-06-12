/**
 * MonthlyStaffSchedule — 月間スタッフ勤務表（シフト表）
 *
 * ある店舗・ある月について、各スタッフが稼働日ごとにどうなる予定なのかを表す。
 * 例: 6/1 に Aさん=早番、Bさん=休み、Cさん=遅番。
 *
 * 各セル（スタッフ×稼働日）は次のいずれか:
 *   - 出勤   : いずれかの勤務帯（勤務帯ID で参照）
 *   - 休み   : DAY_OFF
 *   - 未定   : null（割当レコードが無い場合も未定として扱う）
 *
 * 勤務帯（WorkShift）は独立した集約であり、この勤務表は勤務帯を ID で参照する。
 * 勤務帯ID → WorkShift の解決は上位層（WorkShift 集約のストア）で行う。
 *
 * state は割当をインスタンス（ShiftAssignment）として保持する。
 * シリアライズ用に、入れ子まで全部 plain な MonthlyStaffSchedulePlain を別途定義し、
 * toPlain() / fromPlain() で橋渡しする。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { WorkingDay } from "./WorkingDay.js";
import {
  ShiftAssignment,
  type ShiftAssignmentPlain,
  type ShiftValue,
  DAY_OFF,
} from "./ShiftAssignment.js";

/** state：割当はインスタンスで保持する */
export type MonthlyStaffScheduleState = {
  id: string;
  /** 店舗ID */
  storeId: string;
  /** 対象年 */
  year: number;
  /** 対象月 1-12 */
  month: number;
  /** この勤務表で使える勤務帯のID（早番・中番・遅番など）。WorkShift は独立集約 */
  workShiftIds: string[];
  /** スタッフ×稼働日 の勤務割当 */
  assignments: ShiftAssignment[];
};

/** シリアライズ用：入れ子まで全部 plain */
export type MonthlyStaffSchedulePlain = {
  id: string;
  storeId: string;
  year: number;
  month: number;
  workShiftIds: string[];
  assignments: ShiftAssignmentPlain[];
};

/** セルの状態（出勤／休み／未定）。出勤は勤務帯ID で表す */
export type ShiftCell =
  | { kind: "work"; shiftId: string }
  | { kind: "day-off" }
  | { kind: "undecided" };

export class MonthlyStaffSchedule {
  constructor(readonly state: MonthlyStaffScheduleState) {}

  /** 空の勤務表（全セル未定）を作る */
  static create(params: {
    id: string;
    storeId: string;
    year: number;
    month: number;
    workShiftIds: string[];
  }): MonthlyStaffSchedule {
    return new MonthlyStaffSchedule({
      id: params.id,
      storeId: params.storeId,
      year: params.year,
      month: params.month,
      workShiftIds: params.workShiftIds,
      assignments: [],
    });
  }

  get id(): string {
    return this.state.id;
  }

  get storeId(): string {
    return this.state.storeId;
  }

  get year(): number {
    return this.state.year;
  }

  /** 対象月 1-12 */
  get month(): number {
    return this.state.month;
  }

  // ========== 勤務帯（ID 参照） ==========

  /** この勤務表で使える勤務帯のID一覧 */
  get workShiftIds(): string[] {
    return this.state.workShiftIds;
  }

  hasWorkShift(shiftId: string): boolean {
    return this.state.workShiftIds.includes(shiftId);
  }

  // ========== 稼働日 ==========

  /** その月の全稼働日（1日〜末日） */
  workingDays(): WorkingDay[] {
    const lastDay = new Date(this.state.year, this.state.month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) =>
      WorkingDay.of(this.state.year, this.state.month, i + 1)
    );
  }

  // ========== 割当 ==========

  get assignments(): ShiftAssignment[] {
    return this.state.assignments;
  }

  getAssignment(staffId: string, day: WorkingDay): ShiftAssignment | undefined {
    return this.state.assignments.find(
      (a) => a.staffId === staffId && a.day.equals(day)
    );
  }

  /** 勤務帯を割り当てる（既存割当は上書き）。不変。 */
  assignShift(staffId: string, day: WorkingDay, shiftId: string): MonthlyStaffSchedule {
    if (!this.hasWorkShift(shiftId)) {
      throw new Error(`未知の勤務帯です: ${shiftId}`);
    }
    return this.withAssignment(staffId, day, shiftId);
  }

  /** 休みを割り当てる（既存割当は上書き）。不変。 */
  assignDayOff(staffId: string, day: WorkingDay): MonthlyStaffSchedule {
    return this.withAssignment(staffId, day, DAY_OFF);
  }

  /** 未定にする（明示的に null を立てる）。不変。 */
  markUndecided(staffId: string, day: WorkingDay): MonthlyStaffSchedule {
    return this.withAssignment(staffId, day, null);
  }

  /** 割当レコードを取り除く（未定に戻る）。不変。 */
  clearAssignment(staffId: string, day: WorkingDay): MonthlyStaffSchedule {
    const assignments = this.state.assignments.filter(
      (a) => !(a.staffId === staffId && a.day.equals(day))
    );
    return new MonthlyStaffSchedule({ ...this.state, assignments });
  }

  /**
   * 1セル（スタッフ×稼働日）の勤務割当を、指定の状態へ変更する。不変。
   * - work      : その勤務帯で出勤
   * - day-off   : 休み
   * - undecided : 未定（割当を取り除く）
   */
  setCell(staffId: string, day: WorkingDay, to: ShiftCell): MonthlyStaffSchedule {
    if (to.kind === "work") return this.assignShift(staffId, day, to.shiftId);
    if (to.kind === "day-off") return this.assignDayOff(staffId, day);
    return this.clearAssignment(staffId, day);
  }

  private withAssignment(
    staffId: string,
    day: WorkingDay,
    shift: ShiftValue
  ): MonthlyStaffSchedule {
    const filtered = this.state.assignments.filter(
      (a) => !(a.staffId === staffId && a.day.equals(day))
    );
    const next = new ShiftAssignment({ staffId, day, shift });
    return new MonthlyStaffSchedule({
      ...this.state,
      assignments: [...filtered, next],
    });
  }

  // ========== 問い合わせ ==========

  /**
   * そのセルの状態を返す。
   * 割当レコードが無い場合・null の場合はどちらも "undecided"（未定）。
   * 出勤の場合は勤務帯ID を返す（WorkShift の解決は上位層で行う）。
   */
  statusOf(staffId: string, day: WorkingDay): ShiftCell {
    const assignment = this.getAssignment(staffId, day);
    if (assignment?.isWorking) {
      return { kind: "work", shiftId: assignment.shiftId as string };
    }
    if (assignment?.isDayOff) {
      return { kind: "day-off" };
    }
    return { kind: "undecided" };
  }

  /** 出勤のときの勤務帯ID を返す（休み・未定なら undefined） */
  getShiftIdFor(staffId: string, day: WorkingDay): string | undefined {
    return this.getAssignment(staffId, day)?.shiftId;
  }

  /** 出勤（いずれかの勤務帯）かどうか */
  isWorking(staffId: string, day: WorkingDay): boolean {
    return this.getAssignment(staffId, day)?.isWorking === true;
  }

  /** 休みかどうか */
  isDayOff(staffId: string, day: WorkingDay): boolean {
    return this.getAssignment(staffId, day)?.isDayOff === true;
  }

  /** 未定（レコード無し or null）かどうか */
  isUndecided(staffId: string, day: WorkingDay): boolean {
    const assignment = this.getAssignment(staffId, day);
    return !assignment || assignment.isUndecided;
  }

  /** その稼働日の全割当 */
  assignmentsOn(day: WorkingDay): ShiftAssignment[] {
    return this.state.assignments.filter((a) => a.day.equals(day));
  }

  /** そのスタッフの全割当 */
  assignmentsForStaff(staffId: string): ShiftAssignment[] {
    return this.state.assignments.filter((a) => a.staffId === staffId);
  }

  // ========== シリアライズ ==========

  toPlain(): MonthlyStaffSchedulePlain {
    return {
      id: this.state.id,
      storeId: this.state.storeId,
      year: this.state.year,
      month: this.state.month,
      workShiftIds: [...this.state.workShiftIds],
      assignments: this.state.assignments.map((a) => a.toPlain()),
    };
  }

  static fromPlain(plain: MonthlyStaffSchedulePlain): MonthlyStaffSchedule {
    return new MonthlyStaffSchedule({
      id: plain.id,
      storeId: plain.storeId,
      year: plain.year,
      month: plain.month,
      workShiftIds: [...plain.workShiftIds],
      assignments: plain.assignments.map((a) => ShiftAssignment.fromPlain(a)),
    });
  }
}
