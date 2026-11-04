import {
  ALLOWED_SHIFT_CONSTRAINT,
  ConstraintViolation,
  WorkingDay,
  type CellValuePreview,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { SHIFT_WISH_MISMATCH } from "../shiftWishOptions.js";
import { optionFaceOf } from "./optionFace.js";

describe("optionFaceOf — 選択肢の「入れたときのセルの姿」", () => {
  const day = WorkingDay.fromKey("2026-06-03");
  const other = WorkingDay.fromKey("2026-06-04");
  const v = (
    constraintType: string,
    days: WorkingDay[],
    staffId?: string,
    message = "違反",
    summary?: string
  ) => new ConstraintViolation({ constraintType, staffId, days, message, summary });
  const early: ShiftCell = { kind: "work", shiftId: "early" };
  const ctx = { staffId: "s1", day, shiftMap: new Map(), wishEntries: [] };
  const preview = (after: ConstraintViolation[], introduced: ConstraintViolation[] = []) =>
    ({ cell: early, after, introduced }) as CellValuePreview;

  it("入れたあとにこのセルにかかる違反を印にする（新しいかどうかは問わない）", () => {
    const face = optionFaceOf(
      early,
      preview([v(ALLOWED_SHIFT_CONSTRAINT, [day], "s1", "入れない勤務帯です")]),
      ctx
    );
    expect(face.marks.map((m) => m.kind)).toEqual(["corner"]);
    expect(face.messages).toEqual(["入れない勤務帯です"]);
  });

  it("選択肢には違反の短い要約を重複なく、文はホバー用に全部持つ", () => {
    const face = optionFaceOf(
      early,
      preview([
        v(ALLOWED_SHIFT_CONSTRAINT, [day], "s1", "早番は入れない勤務帯です", "入れない勤務帯"),
        v("max-consecutive-workdays", [day, other], "s1", "6連勤（上限5連勤）", "6連勤（上限5）"),
      ]),
      ctx
    );
    expect(face.labels).toEqual(["入れない勤務帯", "6連勤（上限5）"]);
    expect(face.messages).toEqual(["早番は入れない勤務帯です", "6連勤（上限5連勤）"]);
  });

  it("希望の食い違いは印ではなく希望の円（wishViolation）で描く", () => {
    const face = optionFaceOf(early, preview([v(SHIFT_WISH_MISMATCH, [day], "s1")]), ctx);
    expect(face.marks).toEqual([]);
    expect(face.wishViolation?.constraintType).toBe(SHIFT_WISH_MISMATCH);
  });

  it("セルにかからない違反は、新しく出るものだけ文で添える（印にはしない）", () => {
    const shortage = v("shift-leader:early", [day], undefined, "早番の責任者が居ません");
    const elsewhere = v(ALLOWED_SHIFT_CONSTRAINT, [other], "s1", "別の日");
    const face = optionFaceOf(early, preview([shortage, elsewhere], [shortage]), ctx);
    expect(face.marks).toEqual([]);
    expect(face.messages).toEqual(["早番の責任者が居ません"]);
  });

  it("破線（提案）は、唯一の提案と同じ値のときだけ", () => {
    expect(optionFaceOf(early, undefined, { ...ctx, forced: early }).proposed).toBe(true);
    expect(
      optionFaceOf(early, undefined, { ...ctx, forced: { kind: "day-off" } }).proposed
    ).toBe(false);
    expect(optionFaceOf(early, undefined, ctx).proposed).toBe(false);
  });
});
