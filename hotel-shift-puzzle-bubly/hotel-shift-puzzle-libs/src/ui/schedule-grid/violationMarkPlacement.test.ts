import {
  ALLOWED_SHIFT_CONSTRAINT,
  ConstraintViolation,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { SHIFT_WISH_MISMATCH } from "../shiftWishOptions.js";
import { violationMarksOf } from "./violationMarkPlacement.js";

describe("violationMarksOf — 違反の印の置き場所", () => {
  // 表示中の日（列）
  const days = ["01", "02", "03", "04", "05", "06", "07"].map((d) =>
    WorkingDay.fromKey(`2026-06-${d}`)
  );
  const on = (...dd: string[]) => dd.map((d) => WorkingDay.fromKey(`2026-06-${d}`));
  const violation = (constraintType: string, vdays: WorkingDay[], staffId = "s1") =>
    new ConstraintViolation({ constraintType, staffId, days: vdays, message: "違反" });

  const anchor = (d: string) => WorkingDay.fromKey(`2026-06-${d}`);

  it("連勤は、覆う範囲の末尾のセルに印1つ（そこから左へ span 列）", () => {
    const marks = violationMarksOf(
      [violation("max-consecutive-workdays", on("02", "03", "04", "05", "06", "07"))],
      "s1",
      days
    );

    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ kind: "range", anchorDay: anchor("07"), span: 6 });
  });

  it("勤務間インターバルは、後の日のセルに印1つ（左端が境目）", () => {
    const marks = violationMarksOf(
      [violation("shift-interval:late", on("03", "04"))],
      "s1",
      days
    );

    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ kind: "interval", anchorDay: anchor("04") });
  });

  it("希望の食い違いは希望の円が受け持つので、印にしない", () => {
    expect(violationMarksOf([violation(SHIFT_WISH_MISMATCH, on("03"))], "s1", days)).toEqual([]);
  });

  it("★ 希望以外の1日の違反（可能勤務帯）は、そのセルの角に印1つ", () => {
    const allowed = violation(ALLOWED_SHIFT_CONSTRAINT, on("03"));
    const marks = violationMarksOf([allowed], "s1", days);

    expect(marks).toHaveLength(1);
    expect(marks[0].kind).toBe("corner");
    expect(marks[0].violation).toBe(allowed);
    expect(marks[0].anchorDay.key).toBe("2026-06-03");
  });

  it("★ 連勤の範囲の中に可能勤務帯の違反があっても、帯と角に分かれて両方出る", () => {
    const marks = violationMarksOf(
      [
        violation("max-consecutive-workdays", on("02", "03", "04")),
        violation(ALLOWED_SHIFT_CONSTRAINT, on("03")),
      ],
      "s1",
      days
    );

    expect(marks.map((m) => m.kind).sort()).toEqual(["corner", "range"]);
  });

  it("他のスタッフの違反は印にしない", () => {
    expect(
      violationMarksOf(
        [violation("max-consecutive-workdays", on("01", "02"), "s2")],
        "s1",
        days
      )
    ).toEqual([]);
  });

  it("表示中の日にはみ出す違反は、見えている範囲だけに置く／見えなければ置かない", () => {
    const shown = days.slice(0, 3); // 6/1〜6/3 だけ表示
    const marks = violationMarksOf(
      [
        violation("max-consecutive-workdays", on("02", "03", "04", "05")),
        violation("max-consecutive-workdays", on("05", "06")),
      ],
      "s1",
      shown
    );

    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ anchorDay: anchor("03"), span: 2 });
  });

  it("勤務間インターバルの境目が表の外にかかるときは置かない", () => {
    const shown = days.slice(0, 3); // 6/1〜6/3 だけ表示。6/3→6/4 の境目は表の外
    expect(
      violationMarksOf([violation("shift-interval", on("03", "04"))], "s1", shown)
    ).toEqual([]);
  });
});
