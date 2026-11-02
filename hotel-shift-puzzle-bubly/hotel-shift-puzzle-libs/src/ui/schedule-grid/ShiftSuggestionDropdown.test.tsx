import { render } from "@testing-library/react";
import {
  ALLOWED_SHIFT_CONSTRAINT,
  ConstraintViolation,
  WorkShift,
  WorkingDay,
  type ShiftSuggestion,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftSuggestionDropdown } from "./ShiftSuggestionDropdown.js";

/**
 * 選択肢は「それを入れたときのセルの姿」で描く。違反が出る選択肢も消さず、並びも変えない。
 */
describe("ShiftSuggestionDropdown", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const late = WorkShift.of("late", "遅番", { hour: 13 });
  const suggestions: ShiftSuggestion[] = [
    { kind: "work", shift: early },
    { kind: "work", shift: late },
    { kind: "day-off" },
    { kind: "undecided" },
  ];
  const violation = (constraintType: string, message: string) =>
    new ConstraintViolation({
      constraintType,
      staffId: "s1",
      days: [WorkingDay.fromKey("2026-06-01")],
      message,
    });

  const renderDropdown = (
    violationsOf?: (s: ShiftSuggestion) => ConstraintViolation[]
  ) => {
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    render(
      <ShiftSuggestionDropdown
        open
        anchorEl={anchor}
        suggestions={suggestions}
        activeIndex={0}
        onPick={() => undefined}
        violationsOf={violationsOf}
      />
    );
    return Array.from(document.querySelectorAll<HTMLElement>(".e-option"));
  };

  it("違反が出る選択肢も並びを変えずに残し、違反の文を添える", () => {
    const rows = renderDropdown((s) =>
      s.kind === "work" && s.shift.id === "early"
        ? [violation(ALLOWED_SHIFT_CONSTRAINT, "早番は入れない勤務帯です")]
        : s.kind === "day-off"
          ? [violation("max-day-off-per-day", "休みが多すぎます")]
          : []
    );
    expect(rows.map((r) => r.querySelector(".e-name")?.firstChild?.textContent)).toEqual([
      "早番",
      "遅番",
      "休み",
      "未定（クリア）",
    ]);
    expect(rows.map((r) => r.classList.contains("has-violation"))).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(rows[0].textContent).toContain("早番は入れない勤務帯です");
    // ハイライトは先頭のまま（違反の無い選択肢へ飛ばさない）
    expect(rows[0].classList.contains("is-active")).toBe(true);
  });

  it("可能勤務帯の外だけチップを斜線にする（他の違反は角の印だけ）", () => {
    const rows = renderDropdown((s) =>
      s.kind === "work" && s.shift.id === "early"
        ? [violation(ALLOWED_SHIFT_CONSTRAINT, "早番は入れない勤務帯です")]
        : s.kind === "day-off"
          ? [violation("max-day-off-per-day", "休みが多すぎます")]
          : []
    );
    const hatched = rows.map(
      (r) => !!r.querySelector(".e-chip.is-outside-allowed")
    );
    expect(hatched).toEqual([true, false, false, false]);
  });

  it("violationsOf を渡さなければ違反は描かない", () => {
    const rows = renderDropdown();
    expect(rows.some((r) => r.classList.contains("has-violation"))).toBe(false);
  });
});
