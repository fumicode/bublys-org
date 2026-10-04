import { render } from "@testing-library/react";
import {
  ConstraintViolation,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ViolationMarks } from "./ViolationMarks.js";
import { violationMarksOf } from "./violationMarkPlacement.js";

/**
 * 違反の印（連勤の赤帯・勤務間インターバルの境目の印）の**構造**を固定する（#158）。
 *
 * 印は position:absolute で違反が覆う範囲の末尾のセルに張り付く。ObjectView は泡の膜のために
 * position:relative を持つので、印を ObjectView で**包む**と印の基準が幅0の ObjectView になり、
 * 帯が潰れて見えなくなる。違反判定は正しいのに勤務表に何も出ない、という静かな壊れ方をした。
 *
 * jsdom はレイアウトを計算しないので見た目では守れない。代わりに
 * 「印が ObjectView の子孫ではない（ObjectView は印の内側にある）」を構造で守る。
 */
describe("ViolationMarks", () => {
  const days = [
    WorkingDay.fromKey("2026-06-01"),
    WorkingDay.fromKey("2026-06-02"),
  ];
  const violation = (constraintType: string) =>
    new ConstraintViolation({
      constraintType,
      staffId: "s1",
      days,
      message: "違反",
    });

  const renderMarks = (withUrl: boolean) =>
    render(
      <ViolationMarks
        marks={violationMarksOf(
          [violation("max-consecutive-workdays"), violation("shift-interval")],
          "s1",
          days
        )}
        violationUrl={withUrl ? (v) => `violations/${v.constraintType}` : undefined}
      />
    );

  it.each([".e-violation-bar", ".e-interval-bar"])(
    "★ %s は違反1件に1つで、ObjectView に包まれず、内側に ObjectView を持つ",
    (selector) => {
      const { container } = renderMarks(true);

      const markers = Array.from(container.querySelectorAll(selector));
      expect(markers).toHaveLength(1);
      for (const marker of markers) {
        expect(marker.closest("[data-object-view]")).toBeNull();
        expect(marker.querySelector("[data-object-view]")).not.toBeNull();
      }
    }
  );

  it("帯は覆う列の数を --span で持つ（長さは CSS が出す）", () => {
    const { container } = renderMarks(true);

    const bar = container.querySelector<HTMLElement>(".e-violation-bar");
    expect(bar?.style.getPropertyValue("--span")).toBe("2");
  });

  it("★ 境目の丸は当たり判定（ObjectView）の中にある（丸の上からもバブルを開ける）", () => {
    const { container } = renderMarks(true);

    const dot = container.querySelector(".e-interval-bar .e-interval-dot");
    expect(dot?.closest("[data-object-view]")).not.toBeNull();
  });

  it("違反バブルの URL が無いときは、印だけを出す", () => {
    const { container } = renderMarks(false);

    expect(container.querySelectorAll(".e-violation-bar")).toHaveLength(1);
    expect(container.querySelector("[data-object-view]")).toBeNull();
  });
});
