/**
 * ScheduleConstraint — 勤務表が満たすべき制約の抽象
 *
 * 「連勤は5日まで」「週1日は休みが必要」などの制約を、勤務表とは独立した
 * ドメインオブジェクトとして表す。各制約は勤務表を受け取り、違反箇所
 * （ConstraintViolation）の一覧を返す純粋関数 check を持つ。
 *
 * 制約は勤務表の state には保存しない（注入式）。feature 層が適用したい制約の
 * リストを組み立て、勤務表の checkConstraints(constraints) に渡す。
 */
import type { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import type { ConstraintViolation } from "./ConstraintViolation.js";

export interface ScheduleConstraint {
  /** 制約の種別識別子（ConstraintViolation.constraintType と対応） */
  readonly type: string;
  /** 短いラベル（勤務表上部のルール表示のチップ。例: "連勤" / "希望" / "休日"） */
  readonly label: string;
  /** 人が読める1文（例: "連勤は最大5日まで"）。上部のルール表示に使う（宣言的に自己記述） */
  describe(): string;
  /** 勤務表をチェックし、違反箇所の一覧を返す（違反が無ければ空配列） */
  check(schedule: MonthlyStaffSchedule): ConstraintViolation[];
}
