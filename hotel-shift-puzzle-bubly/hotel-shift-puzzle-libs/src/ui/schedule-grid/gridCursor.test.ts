import { WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import { moveCursor, type CursorLayout } from "./gridCursor.js";
import type { CellSelection } from "./types.js";

/**
 * 勤務表のカーソルは1つで、表はひと続き（#156）。
 * スタッフ行の下に必要人数の行が続き、必要人数の行には見出し（全日まとめて）の列がある。
 */
describe("moveCursor（勤務表のカーソル移動）", () => {
  const days = [1, 2, 3].map((d) => WorkingDay.of(2026, 6, d));
  const layout: CursorLayout = {
    staffIds: ["s1", "s2"],
    requiredShiftNames: ["早番", "遅番"],
    days,
  };
  const staff = (staffId: string, d: number): CellSelection => ({
    kind: "staff",
    staffId,
    day: days[d - 1],
  });
  const required = (shiftName: string, d: number | null): CellSelection => ({
    kind: "required",
    shiftName,
    day: d === null ? null : days[d - 1],
  });

  it("★ 一番下のスタッフ行から ↓ で、最初の勤務帯の必要人数へ入る", () => {
    expect(moveCursor(staff("s2", 2), 1, 0, layout)).toEqual(required("早番", 2));
  });

  it("★ 最初の勤務帯の必要人数から ↑ で、一番下のスタッフ行へ戻る", () => {
    expect(moveCursor(required("早番", 2), -1, 0, layout)).toEqual(staff("s2", 2));
  });

  it("必要人数の行の1日目から ← で、行の見出し（全日まとめて）へ", () => {
    expect(moveCursor(required("遅番", 1), 0, -1, layout)).toEqual(required("遅番", null));
  });

  it("見出しから ↑ でスタッフ行へ上がると、1日目に寄せる（スタッフ行に見出しの列は無い）", () => {
    expect(moveCursor(required("早番", null), -1, 0, layout)).toEqual(staff("s2", 1));
  });

  it("見出しから → で1日目へ", () => {
    expect(moveCursor(required("早番", null), 0, 1, layout)).toEqual(required("早番", 1));
  });

  it("スタッフ行の1日目から ← しても留まる（見出しへは行かない）", () => {
    expect(moveCursor(staff("s1", 1), 0, -1, layout)).toEqual(staff("s1", 1));
  });

  it("必要人数の行が無ければ（抽出ビュー）、一番下のスタッフ行で ↓ しても留まる", () => {
    const staffOnly = { ...layout, requiredShiftNames: [] };
    expect(moveCursor(staff("s2", 2), 1, 0, staffOnly)).toEqual(staff("s2", 2));
  });

  it("表の端ではクランプして留まる", () => {
    expect(moveCursor(required("遅番", 3), 1, 1, layout)).toEqual(required("遅番", 3));
    expect(moveCursor(staff("s1", 1), -1, 0, layout)).toEqual(staff("s1", 1));
  });

  it("カーソルが無い（表から消えた）ときは、左上のセルに置く", () => {
    expect(moveCursor(null, 1, 0, layout)).toEqual(staff("s1", 1));
    expect(moveCursor(staff("gone", 2), 1, 0, layout)).toEqual(staff("s1", 1));
  });
});
