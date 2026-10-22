import { render } from "@testing-library/react";
import { DayOffStyle } from "@bublys-org/hotel-shift-puzzle-model";
import { DayOffStyleIcon } from "./DayOffStyleIcon.js";

/** 並べた日のうち休み（緑で塗ったマス）の位置 */
const offIndexes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("rect"))
    .map((r, i) => (r.getAttribute("fill") === "#c8e6c9" ? i : -1))
    .filter((i) => i >= 0);

describe("DayOffStyleIcon", () => {
  it("連休型は休みが隣り合う", () => {
    const { container } = render(<DayOffStyleIcon dayOffStyle={DayOffStyle.clustered()} />);
    const [a, b] = offIndexes(container);
    expect(b - a).toBe(1);
  });

  it("分散型は休みが離れている", () => {
    const { container } = render(<DayOffStyleIcon dayOffStyle={DayOffStyle.spread()} />);
    const [a, b] = offIndexes(container);
    expect(b - a).toBeGreaterThan(1);
  });

  it("何連までが決まっていれば数を添え、無ければ添えない", () => {
    expect(
      render(<DayOffStyleIcon dayOffStyle={DayOffStyle.clustered(4)} />).container.querySelector("text")
        ?.textContent
    ).toBe("4");
    expect(
      render(<DayOffStyleIcon dayOffStyle={DayOffStyle.clustered()} />).container.querySelector("text")
    ).toBeNull();
  });
});
