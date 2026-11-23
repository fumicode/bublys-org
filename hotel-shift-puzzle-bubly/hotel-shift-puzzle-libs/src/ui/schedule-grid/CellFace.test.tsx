import { render } from "@testing-library/react";
import { WorkShift } from "@bublys-org/hotel-shift-puzzle-model";
import { CellFace } from "./CellFace.js";
import type { WishEntry } from "./wishSummary.js";

/**
 * セルの中央は主役（実際の値・唯一の提案の破線・詰みの ×）が使い、主役が居れば
 * 希望の円は左上へ退避する（#153）。
 */
describe("CellFace の希望の円", () => {
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const wishes: WishEntry[] = [
    { key: "day-off", label: "休み", char: "休", pref: "want", color: "#757575" },
    { key: "work:早番", label: "早番", char: "7", pref: "want", shiftId: "early", color: "#1565c0" },
  ];

  const marksOf = (container: HTMLElement) => {
    const marks = container.querySelector(".e-wish-marks");
    return {
      corner: marks?.classList.contains("is-corner"),
      chars: Array.from(container.querySelectorAll(".e-wish-char")).map((e) => e.textContent),
    };
  };

  it("未定で提案も無いセルは、希望の円をすべて中央に並べる", () => {
    const { container } = render(
      <CellFace cell={{ kind: "undecided" }} wishEntries={wishes} />
    );
    expect(marksOf(container)).toEqual({ corner: false, chars: ["休", "7"] });
  });

  it("唯一の提案（破線）があるセルは、希望を左上へ退避し、提案に対応する円を1つ残す", () => {
    const { container } = render(
      <CellFace
        cell={{ kind: "undecided" }}
        wishEntries={wishes}
        forcedCandidate={{ kind: "work", shiftId: "early" }}
        forcedShift={early}
      />
    );
    expect(container.querySelector(".e-forced-value")?.textContent).toBe("7");
    expect(marksOf(container)).toEqual({ corner: true, chars: ["7"] });
  });

  it("詰みのセルも、× と重ならないよう希望を左上へ退避する", () => {
    const { container } = render(
      <CellFace cell={{ kind: "undecided" }} wishEntries={wishes} dead />
    );
    expect(marksOf(container).corner).toBe(true);
  });
});
