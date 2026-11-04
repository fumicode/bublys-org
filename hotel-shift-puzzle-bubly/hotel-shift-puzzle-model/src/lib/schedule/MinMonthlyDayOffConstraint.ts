/**
 * MinMonthlyDayOffConstraint — 月の最低休日数制約
 *
 * 「各スタッフは月に最低 N 日は休む」という制約。
 * 特定の稼働日ではなく「その月ぜんたい」の話なので、違反はスタッフ単位（days は空）で表す。
 *
 * 判定は「今すでに N 日に届いているか」ではなく「残りの未定日を全部休みにしても
 * もう届かない（＝達成不可能）か」で行う。月の途中はまだ休みを入れる余地があるので、
 * 単に「今はまだ N 日未満」というだけでは違反にしない（伝播・候補絞り込みが、月初のように
 * ほぼ未定な状態を毎回「矛盾」と誤検知しないようにするため）。
 *
 * きつさ（#229）: 足りない（足りない日数・違反）。
 * 足りない日数を人ごとに測る。**未定の読み方だけが check() と tightness() で違う**:
 *   - check()     … 楽観的に読む（未定は休みになるかもしれない）＝もう届かないかを見る
 *   - tightness() … 今のまま読む（未定はまだ休みではない）＝今どれだけ足りないかを見る
 * 量の関数は1つなので、どちらで読んでも「何日足りなければ違反か」は食い違わない。
 */
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import { TightnessUnit, sumByUnit, type Tally, type TightnessAmount } from "./Tightness.js";

export const MIN_MONTHLY_DAY_OFF_CONSTRAINT = "min-monthly-day-off";

export const MONTHLY_DAY_OFF_SHORT = new TightnessUnit({
  key: "monthly-day-off-short",
  label: "月の休みの不足（日）",
  violating: true,
});

/** 足りない日数 → 量。足りていれば数えない */
export const monthlyDayOffTallyOf = (shortage: number): Tally | undefined =>
  shortage <= 0 ? undefined : { unit: MONTHLY_DAY_OFF_SHORT, amount: shortage };

/** 未定の読み方。楽観的＝未定は休みになるかもしれない／今のまま＝未定はまだ休みではない */
type UndecidedReading = "optimistic" | "as-is";

/** 測った1件＝1人の月の休み */
type MonthlyDayOff = { staffId: string; off: number; undecided: number; shortage: number };

export class MinMonthlyDayOffConstraint implements ScheduleConstraint {
  readonly type = MIN_MONTHLY_DAY_OFF_CONSTRAINT;
  readonly label = "休日";
  /** 対象スタッフの月間休み日数だけを見る（他スタッフには影響しない） */
  readonly scope = "staff" as const;

  readonly tightnessUnits = [MONTHLY_DAY_OFF_SHORT] as const;

  /** @param minDays 月の最低休日数（既定 8） */
  /**
   * @param minDays  月の最低休日数（既定 8）
   * @param staffIds 測る人。省略すると勤務表に1セルでも入っている人だけを測る
   *   （まだ1セルも無い人は見えない）。探索のように空の勤務表から埋めていくときは、
   *   勤務スタッフを渡す（渡さないと、最初の1セルを置いた瞬間にその人の不足が「現れて」
   *   悪化に見え、何も置けなくなる）
   */
  constructor(
    readonly minDays = 8,
    readonly staffIds?: readonly string[]
  ) {}

  describe(): string {
    return `月に${this.minDays}日以上休む`;
  }

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    // 残りの未定日を全部休みにしても最低日数に届かないときだけ違反にする（達成不可能判定）。
    return this.measure(schedule, "optimistic").flatMap(({ staffId, off, undecided, shortage }) => {
      const tally = monthlyDayOffTallyOf(shortage);
      return tally?.unit.isViolating
        ? [
            new ConstraintViolation({
              constraintType: this.type,
              staffId,
              days: [], // 月単位（特定日ではない）
              amount: tally.amount,
              message: `休みが月${off}日（最低${this.minDays}日必要、残り${undecided}日では届きません）`,
              summary: `月の休みが最低${this.minDays}日に届かない`,
            }),
          ]
        : [];
    });
  }

  tightness(schedule: MonthlyStaffSchedule): TightnessAmount[] {
    return sumByUnit(this.tightnessUnits, this.measure(schedule, "as-is"), (m) =>
      monthlyDayOffTallyOf(m.shortage)
    );
  }

  private measure(schedule: MonthlyStaffSchedule, reading: UndecidedReading): MonthlyDayOff[] {
    const days = schedule.workingDays();
    const staffIds = this.staffIds ?? [...new Set(schedule.assignments.map((a) => a.staffId))];
    return staffIds.map((staffId) => {
      const off = days.filter((d) => schedule.statusOf(staffId, d).kind === "day-off").length;
      const undecided = days.filter((d) => schedule.statusOf(staffId, d).kind === "undecided").length;
      const reachable = reading === "optimistic" ? off + undecided : off;
      return { staffId, off, undecided, shortage: this.minDays - reachable };
    });
  }
}
