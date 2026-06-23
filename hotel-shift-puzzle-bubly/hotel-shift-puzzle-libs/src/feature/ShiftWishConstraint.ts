/**
 * ShiftWishConstraint — シフト希望との食い違いを制約違反として検出する
 *
 * スタッフ月別シフト希望（StaffMonthlyShiftWish）と、勤務表の割当を突き合わせ、
 * 食い違っているセルを ConstraintViolation（1セル=1日）として返す。これにより
 * 連勤制約などと同じ「違反」の仕組みに乗り、グリッドの ⊿ マーカー → 違反バブルで
 * 内容を確認できる。
 *
 * 食い違いの定義（その日に割当があり、希望が設定されている場合のみ判定）:
 *   - 割当が「避けたい(×)」オプションに一致する          → 違反
 *   - 「したい(○)」が1つ以上あるのに、割当がそのどれでもない → 違反
 *   - 未割当（undecided）は判定しない（希望は薄く表示されるだけ）
 *
 * 希望は店舗・勤務表に依存しない別集約なので、ここに注入する（constraints は注入式）。
 */
import {
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  ConstraintViolation,
  type ScheduleConstraint,
} from "@bublys-org/hotel-shift-puzzle-model";
import { DAY_OFF_WISH, workWishKey, wishOptionLabel } from "../ui/shiftWishOptions.js";

export const SHIFT_WISH_MISMATCH = "shift-wish-mismatch";

type Context = {
  /** staffId → その月のシフト希望 */
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  /** 勤務帯ID → 勤務帯名（割当を希望オプションキーに変換するため） */
  shiftNameById: Map<string, string>;
};

export class ShiftWishConstraint implements ScheduleConstraint {
  readonly type = SHIFT_WISH_MISMATCH;

  constructor(private readonly ctx: Context) {}

  check(schedule: MonthlyStaffSchedule): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const day of schedule.workingDays()) {
      for (const [staffId, wish] of this.ctx.wishByStaff) {
        const wishes = wish.wishesOn(day);
        const keys = Object.keys(wishes);
        if (keys.length === 0) continue;

        const status = schedule.statusOf(staffId, day);
        if (status.kind === "undecided") continue; // 未割当は判定しない

        const assigned =
          status.kind === "day-off"
            ? DAY_OFF_WISH
            : workWishKey(this.ctx.shiftNameById.get(status.shiftId) ?? status.shiftId);

        const wants = keys.filter((k) => wishes[k] === "want");
        const avoids = keys.filter((k) => wishes[k] === "avoid");

        const violatesAvoid = avoids.includes(assigned);
        const violatesWant = wants.length > 0 && !wants.includes(assigned);
        if (!violatesAvoid && !violatesWant) continue;

        const wishText = keys
          .map((k) => `${wishOptionLabel(k)}${wishes[k] === "want" ? "○" : "×"}`)
          .join("・");
        const assignedLabel = wishOptionLabel(assigned);

        violations.push(
          new ConstraintViolation({
            constraintType: SHIFT_WISH_MISMATCH,
            staffId,
            days: [day],
            message: `希望と異なる割当です（希望: ${wishText} ／ 割当: ${assignedLabel}）`,
          })
        );
      }
    }

    return violations;
  }
}
