import { render } from "@testing-library/react";
import {
  ALLOWED_SHIFT_CONSTRAINT,
  ConstraintViolation,
  WorkShift,
  WorkingDay,
  type ShiftSuggestion,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftSuggestionDropdown, type ShiftOptionFace } from "./ShiftSuggestionDropdown.js";
import { suggestionToCell } from "./useCellKeyboardEditing.js";

/**
 * 選択肢は「それを入れたときのセルの姿」で描く（勤務表のセルと同じ CellFace）。
 * 違反が出る選択肢も消さず、並びもハイライトの初期位置も変えない。
 */
describe("ShiftSuggestionDropdown", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const late = WorkShift.of("late", "遅番", { hour: 13 });
  const day = WorkingDay.fromKey("2026-06-01");
  const suggestions: ShiftSuggestion[] = [
    { kind: "work", shift: early },
    { kind: "work", shift: late },
    { kind: "day-off" },
    { kind: "undecided" },
  ];
  const allowedViolation = new ConstraintViolation({
    constraintType: ALLOWED_SHIFT_CONSTRAINT,
    staffId: "s1",
    days: [day],
    message: "早番は入れない勤務帯です",
  });

  const faceOf = (s: ShiftSuggestion): ShiftOptionFace => {
    const isEarly = s.kind === "work" && s.shift.id === "early";
    return {
      cell: suggestionToCell(s),
      shift: s.kind === "work" ? s.shift : undefined,
      wishEntries: [],
      marks: isEarly
        ? [{ kind: "corner", violation: allowedViolation, anchorDay: day, span: 1 }]
        : [],
      labels: isEarly ? ["可能勤務帯"] : [],
      messages: isEarly ? [allowedViolation.message] : [],
      proposed: s.kind === "work" && s.shift.id === "late",
    };
  };

  const renderRows = () => {
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    render(
      <ShiftSuggestionDropdown
        open
        anchorEl={anchor}
        suggestions={suggestions}
        activeIndex={0}
        onPick={() => undefined}
        faceOf={faceOf}
      />
    );
    return Array.from(document.querySelectorAll<HTMLElement>(".e-option"));
  };

  it("選択肢を勤務表のセルと同じ部品で描く（値の形・違反の印）", () => {
    const rows = renderRows();
    expect(rows.map((r) => r.querySelector(".e-cell")?.className.includes("e-work"))).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(rows[2].querySelector(".e-cell.e-off")).not.toBeNull();
    // 違反の印は勤務表と同じ（1セルの違反＝右上の三角）。斜線チップは使わない
    expect(rows[0].querySelector(".e-violation-corner")).not.toBeNull();
    // 選択肢には制約の名前だけ。詳しい文はホバー（title）
    expect(rows[0].querySelector(".e-violation")?.textContent).toBe("可能勤務帯");
    expect(rows[0].title).toBe("早番は入れない勤務帯です");
    expect(document.querySelector(".is-outside-allowed")).toBeNull();
  });

  it("並びを変えず、ハイライトは先頭のまま", () => {
    const rows = renderRows();
    expect(rows.map((r) => r.querySelector(".e-name")?.textContent)).toEqual([
      "早番",
      "遅番",
      "休み",
      "未定（クリア）",
    ]);
    expect(rows[0].classList.contains("is-active")).toBe(true);
  });

  it("破線（唯一の提案）は提案の値の選択肢にだけ付く", () => {
    const rows = renderRows();
    expect(rows.map((r) => r.classList.contains("is-proposed"))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});
