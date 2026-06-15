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
import {
  RequiredStaffing,
  type RequiredStaffingPlain,
} from "./RequiredStaffing.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { ConstraintViolation } from "./ConstraintViolation.js";

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
  /** 稼働日×勤務帯名 の必要スタッフ数 */
  requiredStaffing: RequiredStaffing;
};

/** シリアライズ用：入れ子まで全部 plain */
export type MonthlyStaffSchedulePlain = {
  id: string;
  storeId: string;
  year: number;
  month: number;
  workShiftIds: string[];
  assignments: ShiftAssignmentPlain[];
  requiredStaffing: RequiredStaffingPlain;
};

/** セルの状態（出勤／休み／未定）。出勤は勤務帯ID で表す */
export type ShiftCell =
  | { kind: "work"; shiftId: string }
  | { kind: "day-off" }
  | { kind: "undecided" };

export class MonthlyStaffSchedule {
  constructor(readonly state: MonthlyStaffScheduleState) {}

  /** 空の勤務表（全セル未定）を作る。必要スタッフ数は省略時は未設定。 */
  static create(params: {
    id: string;
    storeId: string;
    year: number;
    month: number;
    workShiftIds: string[];
    requiredStaffing?: RequiredStaffing;
  }): MonthlyStaffSchedule {
    return new MonthlyStaffSchedule({
      id: params.id,
      storeId: params.storeId,
      year: params.year,
      month: params.month,
      workShiftIds: params.workShiftIds,
      assignments: [],
      requiredStaffing: params.requiredStaffing ?? RequiredStaffing.empty(),
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

  /**
   * その稼働日に、各勤務帯ID で何人が出勤予定かを数える（休み・未定は除く）。
   * 勤務帯の「名前でのグルーピング（早番が同じ名前なら同一とみなす）」は WorkShift の
   * 解決が要るので上位層で行う。ここは勤務帯ID 単位の素の集計に徹する。
   */
  countWorkingByShift(day: WorkingDay): Map<string, number> {
    const counts = new Map<string, number>();
    for (const a of this.assignmentsOn(day)) {
      const shiftId = a.shiftId;
      if (shiftId) counts.set(shiftId, (counts.get(shiftId) ?? 0) + 1);
    }
    return counts;
  }

  /** その稼働日に休みの人数を数える（出勤・未定は除く） */
  countDayOffOn(day: WorkingDay): number {
    return this.assignmentsOn(day).filter((a) => a.isDayOff).length;
  }

  // ========== 必要スタッフ数 ==========

  /** 必要スタッフ数（稼働日×勤務帯名） */
  get requiredStaffing(): RequiredStaffing {
    return this.state.requiredStaffing;
  }

  /** その稼働日・その勤務帯名の必要人数（未設定は0） */
  requiredFor(day: WorkingDay, shiftName: string): number {
    return this.state.requiredStaffing.requiredFor(day, shiftName);
  }

  /**
   * その稼働日・その勤務帯名の必要人数を設定した新しい勤務表を返す。不変。
   * count <= 0 ならその設定を取り除く。
   */
  setRequired(day: WorkingDay, shiftName: string, count: number): MonthlyStaffSchedule {
    return new MonthlyStaffSchedule({
      ...this.state,
      requiredStaffing: this.state.requiredStaffing.setRequired(day, shiftName, count),
    });
  }

  /**
   * その勤務帯名の必要人数を、この勤務表の全稼働日にまとめて設定した
   * 新しい勤務表を返す。不変。count <= 0 なら取り除く。
   */
  setRequiredForAllDays(shiftName: string, count: number): MonthlyStaffSchedule {
    return new MonthlyStaffSchedule({
      ...this.state,
      requiredStaffing: this.state.requiredStaffing.setRequiredForDays(
        this.workingDays(),
        shiftName,
        count
      ),
    });
  }

  // ========== 制約チェック ==========

  /**
   * 与えられた制約すべてでこの勤務表をチェックし、違反箇所を返す。
   * 純粋・不変（state は変えない）。変更のたびに呼び直して再計算する想定。
   * 制約は勤務表に保存せず、呼び出し側（feature 層）が注入する。
   */
  checkConstraints(constraints: ScheduleConstraint[]): ConstraintViolation[] {
    return constraints.flatMap((c) => c.check(this));
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
      requiredStaffing: this.state.requiredStaffing.toPlain(),
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
      requiredStaffing: RequiredStaffing.fromPlain(plain.requiredStaffing),
    });
  }
}
