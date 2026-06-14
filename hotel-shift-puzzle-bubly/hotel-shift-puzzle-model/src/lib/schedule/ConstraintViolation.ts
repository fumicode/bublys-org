/**
 * ConstraintViolation — 制約違反
 *
 * 勤務表が満たすべき制約に違反している箇所を表す値オブジェクト。
 * 「誰の・どの稼働日範囲が・どの制約に・なぜ」違反しているかを保持する。
 *
 * 違反は勤務表から都度計算される（永続化しない）が、UI / バブル層へ渡したり
 * バブルのパラメータに乗せたりできるよう toPlain() / fromPlain() を備える。
 * 不変。
 */
import { WorkingDay } from "./WorkingDay.js";

/** state：稼働日はインスタンス（WorkingDay）として保持する */
export type ConstraintViolationState = {
  /** 制約の種別識別子（例: "max-consecutive-workdays"） */
  constraintType: string;
  /** 違反しているスタッフ */
  staffId: string;
  /** 違反している稼働日範囲（昇順） */
  days: WorkingDay[];
  /** 人が読める説明（例: "6連勤（上限5連勤）"） */
  message: string;
};

/** シリアライズ用：入れ子まで全部 plain */
export type ConstraintViolationPlain = {
  constraintType: string;
  staffId: string;
  /** WorkingDay.key の配列（"2026-06-01" 形式、昇順） */
  dayKeys: string[];
  message: string;
};

export class ConstraintViolation {
  constructor(readonly state: ConstraintViolationState) {}

  get constraintType(): string {
    return this.state.constraintType;
  }

  get staffId(): string {
    return this.state.staffId;
  }

  /** 違反している稼働日範囲（昇順） */
  get days(): WorkingDay[] {
    return this.state.days;
  }

  get message(): string {
    return this.state.message;
  }

  /** 一意キー（バブルのパラメータ等に使える）。範囲の先頭・末尾で表す */
  get key(): string {
    const first = this.state.days[0]?.key ?? "";
    const last = this.state.days[this.state.days.length - 1]?.key ?? "";
    return `${this.state.constraintType}:${this.state.staffId}:${first}_${last}`;
  }

  /** その稼働日が違反範囲に含まれるか */
  coversDay(day: WorkingDay): boolean {
    return this.state.days.some((d) => d.equals(day));
  }

  /** そのセル（スタッフ×稼働日）が違反範囲に含まれるか */
  coversCell(staffId: string, day: WorkingDay): boolean {
    return this.state.staffId === staffId && this.coversDay(day);
  }

  toPlain(): ConstraintViolationPlain {
    return {
      constraintType: this.state.constraintType,
      staffId: this.state.staffId,
      dayKeys: this.state.days.map((d) => d.key),
      message: this.state.message,
    };
  }

  static fromPlain(plain: ConstraintViolationPlain): ConstraintViolation {
    return new ConstraintViolation({
      constraintType: plain.constraintType,
      staffId: plain.staffId,
      days: plain.dayKeys.map((k) => WorkingDay.fromKey(k)),
      message: plain.message,
    });
  }
}
