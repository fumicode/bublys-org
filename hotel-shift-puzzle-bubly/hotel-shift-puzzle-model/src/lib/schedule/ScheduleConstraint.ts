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

/**
 * この制約の check() が、1セルの変更によってどの範囲まで結果が変わりうるかを表す。
 * 候補絞り込み（伝播）が「変更セルの影響範囲」を求めるときに使う。
 *   - 'staff'  : 同じスタッフの別の日には影響しうるが、他のスタッフには影響しない
 *   - 'day'    : 同じ日の別のスタッフには影響しうるが、他の日には影響しない
 *   - 'cell'   : そのセル自身にしか依存しない（他のどのセルにも影響しない）
 *   - 'global' : 上記に収まらない（省略時のデフォルト。安全側＝全体を再計算）
 * 新しく制約を実装するときは、check() が実際に読んでいる範囲を確認したうえで宣言すること。
 * 誤って狭く申告すると、影響範囲の外にあるセルの再計算が漏れる。
 */
export type ScheduleConstraintScope = "staff" | "day" | "cell" | "global";

export interface ScheduleConstraint {
  /** 制約の種別識別子（ConstraintViolation.constraintType と対応） */
  readonly type: string;
  /** 短いラベル（勤務表上部のルール表示のチップ。例: "連勤" / "希望" / "休日"） */
  readonly label: string;
  /** この制約の影響範囲。省略時は 'global'（安全側）として扱う */
  readonly scope?: ScheduleConstraintScope;
  /** 人が読める1文（例: "連勤は最大5日まで"）。上部のルール表示に使う（宣言的に自己記述） */
  describe(): string;
  /** 勤務表をチェックし、違反箇所の一覧を返す（違反が無ければ空配列） */
  check(schedule: MonthlyStaffSchedule): ConstraintViolation[];
}
