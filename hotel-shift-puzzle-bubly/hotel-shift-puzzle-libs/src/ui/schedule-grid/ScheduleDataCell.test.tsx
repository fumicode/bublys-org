import { render } from "@testing-library/react";
import {
  ConstraintViolation,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleDataCell } from "./ScheduleDataCell.js";

/**
 * 違反の印（連勤の赤帯・勤務間インターバルの境目の印）の**構造**を固定する（#158）。
 *
 * 印は position:absolute でセルの端に張り付く。ObjectView は泡の膜のために
 * position:relative を持つので、印を ObjectView で**包む**と印の基準が幅0の ObjectView になり、
 * 帯が潰れて見えなくなる。違反判定は正しいのに勤務表に何も出ない、という静かな壊れ方をした。
 *
 * jsdom はレイアウトを計算しないので見た目では守れない。代わりに
 * 「印が ObjectView の子孫ではない（ObjectView は印の内側にある）」を構造で守る。
 */
describe("ScheduleDataCell の違反の印", () => {
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

  const renderCell = (withUrl: boolean) =>
    render(
      <ScheduleDataCell
        cell={{ kind: "work", shiftId: "early" }}
        wishEntries={[]}
        rangeViolation={violation("max-consecutive-workdays")}
        intervalBefore={violation("shift-interval")}
        intervalAfter={violation("shift-interval")}
        cellKey="s1:2026-06-01"
        onPress={() => undefined}
        onOpenEditor={() => undefined}
        violationUrl={withUrl ? (v) => `violations/${v.constraintType}` : undefined}
      />
    );

  it.each([
    [".e-violation-bar", 1],
    [".e-interval-bar", 2],
  ])("★ %s は ObjectView に包まれず、内側に ObjectView を持つ", (selector, count) => {
    const { container } = renderCell(true);

    const markers = Array.from(container.querySelectorAll(selector));
    expect(markers).toHaveLength(count);
    for (const marker of markers) {
      expect(marker.closest("[data-object-view]")).toBeNull();
      expect(marker.querySelector("[data-object-view]")).not.toBeNull();
    }
  });

  it("違反バブルの URL が無いときは、印だけを出す", () => {
    const { container } = renderCell(false);

    expect(container.querySelectorAll(".e-violation-bar")).toHaveLength(1);
    expect(container.querySelector("[data-object-view]")).toBeNull();
  });
});
