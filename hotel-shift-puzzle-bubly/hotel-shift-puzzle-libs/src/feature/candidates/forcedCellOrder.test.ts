import { WorkingDay, type ForcedCell } from "@bublys-org/hotel-shift-puzzle-model";
import { orderForcedCells, nextForcedCellAfter } from "./forcedCellOrder.js";

const dayOff: ForcedCell["cell"] = { kind: "day-off" };
const forced = (staffId: string, day: number): ForcedCell => ({
  staffId,
  day: WorkingDay.of(2026, 6, day),
  cell: dayOff,
});

describe("orderForcedCells", () => {
  it("スタッフ行順 → 稼働日順に並べる", () => {
    const ordered = orderForcedCells(
      [forced("s2", 1), forced("s1", 5), forced("s1", 2)],
      ["s1", "s2"]
    );

    expect(ordered.map((c) => `${c.staffId}:${c.day.day}`)).toEqual([
      "s1:2",
      "s1:5",
      "s2:1",
    ]);
  });

  it("行順に無いスタッフは末尾に置く（消えない）", () => {
    const ordered = orderForcedCells([forced("unknown", 1), forced("s1", 9)], ["s1"]);

    expect(ordered.map((c) => c.staffId)).toEqual(["s1", "unknown"]);
  });
});

describe("nextForcedCellAfter", () => {
  const ordered = orderForcedCells(
    [forced("s1", 2), forced("s1", 5), forced("s2", 1)],
    ["s1", "s2"]
  );

  it("承認したセルの次を返す", () => {
    const next = nextForcedCellAfter(ordered, { staffId: "s1", dayKey: "2026-06-02" });
    expect(next).toMatchObject({ staffId: "s1" });
    expect(next?.day.day).toBe(5);
  });

  it("末尾を承認したら先頭へ回り込む", () => {
    const next = nextForcedCellAfter(ordered, { staffId: "s2", dayKey: "2026-06-01" });
    expect(next).toMatchObject({ staffId: "s1" });
    expect(next?.day.day).toBe(2);
  });

  it("他に提案が無ければ undefined", () => {
    const single = [forced("s1", 2)];
    expect(
      nextForcedCellAfter(single, { staffId: "s1", dayKey: "2026-06-02" })
    ).toBeUndefined();
  });

  it("承認したセルが一覧に無ければ先頭を返す", () => {
    const next = nextForcedCellAfter(ordered, { staffId: "s9", dayKey: "2026-06-09" });
    expect(next).toMatchObject({ staffId: "s1" });
    expect(next?.day.day).toBe(2);
  });
});
