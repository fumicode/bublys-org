import {
  ALLOWED_SHIFT_CONSTRAINT,
  ConstraintViolation,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { SHIFT_WISH_MISMATCH } from "../shiftWishOptions.js";
import { cellViolationMarks } from "./cellViolationMarks.js";

describe("cellViolationMarks（セルの違反をどの印で描くか）", () => {
  const day1 = WorkingDay.fromKey("2026-06-01");
  const day2 = WorkingDay.fromKey("2026-06-02");
  const violation = (constraintType: string, days: WorkingDay[]) =>
    new ConstraintViolation({ constraintType, staffId: "s1", days, message: "違反" });

  it("★ 希望以外の1日の違反（可能勤務帯）は右上の角で描く", () => {
    const allowed = violation(ALLOWED_SHIFT_CONSTRAINT, [day1]);
    const marks = cellViolationMarks([allowed]);
    expect(marks.corner).toBe(allowed);
    expect(marks.bar).toBeUndefined();
    expect(marks.wish).toBeUndefined();
  });

  it("★ 連勤の範囲の中に可能勤務帯の違反があっても、帯と角に分かれて両方出る", () => {
    const allowed = violation(ALLOWED_SHIFT_CONSTRAINT, [day1]);
    const run = violation("max-consecutive-workdays", [day1, day2]);
    const marks = cellViolationMarks([allowed, run]);
    expect(marks.bar).toBe(run);
    expect(marks.corner).toBe(allowed);
  });

  it("希望の食い違いは希望の円で描き、赤帯にはしない", () => {
    const wish = violation(SHIFT_WISH_MISMATCH, [day1]);
    const marks = cellViolationMarks([wish]);
    expect(marks.wish).toBe(wish);
    expect(marks.bar).toBeUndefined();
  });

  it("勤務間インターバルは2日にまたがっても帯にせず、境目の印に回す", () => {
    const interval = violation("shift-interval:late", [day1, day2]);
    const marks = cellViolationMarks([interval]);
    expect(marks.bar).toBeUndefined();
    expect(marks.interval).toEqual([interval]);
  });
});
