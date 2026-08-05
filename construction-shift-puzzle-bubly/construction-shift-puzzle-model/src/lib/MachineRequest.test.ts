import { MachineRequest } from "./MachineRequest.js";
import { PlacementBoard } from "./PlacementBoard.js";
import { ResourceRef } from "./ResourceRef.js";
import { WorkingDay } from "./WorkingDay.js";

const d = (n: number) => WorkingDay.of(2026, 8, n);

const wish = () =>
  MachineRequest.create({ id: "w1", siteId: "siteA", machineId: "m1", from: d(2), to: d(4) });

describe("MachineRequest", () => {
  it("create は from<=to に正規化して保持する", () => {
    const w = MachineRequest.create({ id: "w1", siteId: "s", machineId: "m", from: d(4), to: d(2) });
    expect(w.range().from.key).toBe("2026-08-02");
    expect(w.range().to.key).toBe("2026-08-04");
  });

  it("resize で期間を変えられる", () => {
    const w = wish().resize(d(2), d(6));
    expect(w.range().to.key).toBe("2026-08-06");
  });

  it("希望の達成は board.coversResource から導出できる（未達→達成）", () => {
    const w = wish();
    const machineRef = ResourceRef.machine(w.machineId);
    let board = PlacementBoard.create({ id: "b1", from: d(1), to: d(7) });
    expect(board.coversResource(machineRef, w.siteId, w.range())).toBe(false);

    // その機械をその現場に希望期間で割り当てると達成になる
    board = board.assign("a1", machineRef, w.siteId, w.range().from, w.range().to);
    expect(board.coversResource(machineRef, w.siteId, w.range())).toBe(true);
  });
});
