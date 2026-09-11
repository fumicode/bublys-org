/**
 * ShiftIntervalConstraint — 勤務間インターバルのルールを「違反を出す制約」として扱うアダプタ
 *
 * 宣言的な ShiftIntervalRule（「遅番の翌日は早番・中番に入れない」）を、他の制約（連勤上限など）と
 * 同じ ScheduleConstraint インターフェースに載せる。
 *
 * 入れていいかの判定は持たない。ルールの allowsNextDay() に訊くだけで、ここの仕事は2つ:
 *   1. 勤務表のセル（勤務帯ID）を、ルールが話している勤務帯名に翻訳する
 *   2. 弾かれた組を ConstraintViolation に詰め替える
 * 判定をこちらに写すと、同じ「入れていいか」がサンプル生成器とここの2箇所に書かれてしまう。
 * ShiftLeaderConstraint が countOnShift/isSatisfiedOn を ShiftLeaderRule に任せているのと同じ形。
 *
 * 違反範囲を [前日, 翌日] の2日にしているのは、違反しているのがどちらか一方のセルではなく
 * 「2日のつなぎ目（間隔）」だから。表もこの2日の境目に印を出す。
 *
 * 勤務帯の解決（shiftName → 勤務帯ID集合）は勤務表側の事情なので、責任者制約と同じく
 * 呼び出し側から shiftIdsOf を受け取る（同名で開始時刻違いの勤務帯が複数あってよいため）。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { ShiftIntervalRule } from "./ShiftIntervalRule.js";
import type { WorkingDay } from "./WorkingDay.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";

/** 制約種別の接頭辞。ルールキーを付けて "shift-interval:late" のように一意にする。 */
export const SHIFT_INTERVAL_CONSTRAINT = "shift-interval";

/** その制約種別が勤務間インターバル（＝2日の境目の違反）か。表示側が印の形を選ぶのに使う。 */
export const isShiftIntervalConstraintType = (type: string): boolean =>
  type === SHIFT_INTERVAL_CONSTRAINT ||
  type.startsWith(`${SHIFT_INTERVAL_CONSTRAINT}:`);

export class ShiftIntervalConstraint implements ScheduleConstraint {
  readonly type: string;
  readonly label: string;
  /** 対象スタッフの前後の日だけを見る（他スタッフには影響しない） */
  readonly scope = "staff" as const;

  /**
   * このルールが名指ししている勤務帯の ID → 勤務帯名。
   * ルールは勤務帯を名前で語り、勤務表はIDで持つので、その間を埋めるためだけの表。
   * ここに載っていないID（このルールと関係ない勤務帯）は undefined ＝ルールの対象外になる。
   */
  private readonly shiftNameById: Map<string, string>;

  /**
   * @param rule       勤務間インターバルのルール
   * @param shiftIdsOf 勤務帯名 → この勤務表で使う勤務帯ID群（同名の複数IDをまとめて扱う）
   */
  constructor(
    readonly rule: ShiftIntervalRule,
    shiftIdsOf: (shiftName: string) => string[]
  ) {
    this.type = `${SHIFT_INTERVAL_CONSTRAINT}:${rule.key}`;
    this.label = rule.label;
    this.shiftNameById = new Map();
    for (const name of [rule.fromShiftName, ...rule.forbiddenNextShiftNames]) {
      for (const id of shiftIdsOf(name)) this.shiftNameById.set(id, name);
    }
  }

  describe(): string {
    return this.rule.describe();
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    // この勤務表にルールの勤務帯が1つも無い（名前が違うセット）なら、見るまでもない
    if (this.shiftNameById.size === 0) return violations;

    const days = schedule.workingDays();
    const staffIds = [...new Set(schedule.assignments.map((a) => a.staffId))];

    for (const staffId of staffIds) {
      for (let i = 0; i + 1 < days.length; i++) {
        const prevDay = days[i];
        const nextDay = days[i + 1];
        const prevShiftName = this.shiftNameOn(schedule, staffId, prevDay);
        const nextShiftName = this.shiftNameOn(schedule, staffId, nextDay);

        // 名前が引けないセル（休み・未定・ルール対象外の勤務帯）は語ることが無い。
        // 判定そのものは下の allowsNextDay に任せる。
        if (prevShiftName === undefined || nextShiftName === undefined) continue;
        if (this.rule.allowsNextDay(prevShiftName, nextShiftName)) continue;

        violations.push(
          new ConstraintViolation({
            constraintType: this.type,
            staffId,
            // 違反しているのは「この2日のつなぎ目」なので、範囲は前日と翌日の2日。
            days: [prevDay, nextDay],
            message: `${prevShiftName}の翌日に${nextShiftName}（${this.rule.restReason}）`,
          })
        );
      }
    }

    return violations;
  }

  /** そのセルの勤務帯名（休み・未定・ルールが名指ししていない勤務帯なら undefined） */
  private shiftNameOn(
    schedule: MonthlyStaffSchedule,
    staffId: string,
    day: WorkingDay
  ): string | undefined {
    const shiftId = schedule.getShiftIdFor(staffId, day);
    return shiftId === undefined ? undefined : this.shiftNameById.get(shiftId);
  }
}
