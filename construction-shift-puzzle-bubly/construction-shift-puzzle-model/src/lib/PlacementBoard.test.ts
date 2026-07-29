import { PlacementBoard } from "./PlacementBoard.js";
import { ResourceRef } from "./ResourceRef.js";
import { WorkingDay } from "./WorkingDay.js";

const d1 = WorkingDay.of(2026, 7, 1);
const d2 = WorkingDay.of(2026, 7, 2);
const emp = ResourceRef.employee("e1");
const mac = ResourceRef.machine("m1");

const board = () =>
  PlacementBoard.create({ id: "b1", from: d1, to: WorkingDay.of(2026, 7, 3) });

describe("PlacementBoard", () => {
  it("days() は from..to を両端含めて列挙する", () => {
    expect(board().days().map((d) => d.key)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("assign でリソースを現場に配置できる", () => {
    const b = board().assign(emp, "siteA", d1);
    expect(b.resourcesOn("siteA", d1).map((r) => r.key)).toEqual(["employee:e1"]);
  });

  it("assign は冪等（同一 ref/site/day の重複追加をしない）", () => {
    const b = board().assign(emp, "siteA", d1).assign(emp, "siteA", d1);
    expect(b.assignments).toHaveLength(1);
  });

  it("社員と機械を同じセルに配置できる", () => {
    const b = board().assign(emp, "siteA", d1).assign(mac, "siteA", d1);
    expect(b.resourcesOn("siteA", d1).map((r) => r.key).sort()).toEqual([
      "employee:e1",
      "machine:m1",
    ]);
  });

  it("unassign で配置を外せる", () => {
    const b = board().assign(emp, "siteA", d1).unassign(emp, "siteA", d1);
    expect(b.resourcesOn("siteA", d1)).toHaveLength(0);
  });

  it("move で現場から現場へ移せる", () => {
    const b = board()
      .assign(mac, "siteA", d1)
      .move(mac, d1, "siteA", "siteB");
    expect(b.resourcesOn("siteA", d1)).toHaveLength(0);
    expect(b.resourcesOn("siteB", d1).map((r) => r.key)).toEqual(["machine:m1"]);
  });

  it("同一リソースを同日に複数現場へ置くと conflicts() が検知する", () => {
    const b = board().assign(emp, "siteA", d1).assign(emp, "siteB", d1);
    const conflicts = b.conflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].ref.key).toBe("employee:e1");
    expect(conflicts[0].day.key).toBe("2026-07-01");
    expect(conflicts[0].siteIds.sort()).toEqual(["siteA", "siteB"]);
    expect(b.isConflicted(emp, d1)).toBe(true);
  });

  it("別日の同一現場配置は重複ではない", () => {
    const b = board().assign(emp, "siteA", d1).assign(emp, "siteA", d2);
    expect(b.conflicts()).toHaveLength(0);
  });

  it("freeResourcesOn は当日どこにも配置されていないリソースを返す", () => {
    const b = board().assign(emp, "siteA", d1);
    expect(b.freeResourcesOn(d1, [emp, mac]).map((r) => r.key)).toEqual([
      "machine:m1",
    ]);
    expect(b.freeResourcesOn(d2, [emp, mac]).map((r) => r.key).sort()).toEqual([
      "employee:e1",
      "machine:m1",
    ]);
  });

  it("toPlain / fromPlain で往復できる", () => {
    const b = board().assign(emp, "siteA", d1).assign(mac, "siteB", d2);
    const restored = PlacementBoard.fromPlain(b.toPlain());
    expect(restored.toPlain()).toEqual(b.toPlain());
    expect(restored.resourcesOn("siteA", d1).map((r) => r.key)).toEqual([
      "employee:e1",
    ]);
  });
});
