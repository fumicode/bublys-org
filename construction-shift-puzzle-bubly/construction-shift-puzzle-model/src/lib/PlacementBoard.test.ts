import { PlacementBoard } from "./PlacementBoard.js";
import { ResourceRef } from "./ResourceRef.js";
import { DateRange } from "./DateRange.js";
import { WorkingDay } from "./WorkingDay.js";

const d = (n: number) => WorkingDay.of(2026, 8, n);
const emp = ResourceRef.employee("e1");
const mac = ResourceRef.machine("m1");

const board = () =>
  PlacementBoard.create({ id: "b1", from: d(1), to: d(7) });

describe("PlacementBoard (span)", () => {
  it("days() は from..to を両端含めて列挙する", () => {
    expect(board().days().map((x) => x.key)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  it("assign で期間配置ができ、期間内の各日に現れる", () => {
    const b = board().assign("a1", emp, "siteA", d(2), d(4));
    expect(b.resourcesOn("siteA", d(1))).toHaveLength(0);
    expect(b.resourcesOn("siteA", d(2)).map((r) => r.key)).toEqual(["employee:e1"]);
    expect(b.resourcesOn("siteA", d(4)).map((r) => r.key)).toEqual(["employee:e1"]);
    expect(b.resourcesOn("siteA", d(5))).toHaveLength(0);
  });

  it("resizeAssignment で期間を伸縮できる", () => {
    const b = board()
      .assign("a1", mac, "siteA", d(2), d(2))
      .resizeAssignment("a1", d(2), d(5));
    expect(b.resourcesOn("siteA", d(5)).map((r) => r.key)).toEqual(["machine:m1"]);
  });

  it("moveAssignment で別現場・別期間へ移せる", () => {
    const b = board()
      .assign("a1", mac, "siteA", d(1), d(2))
      .moveAssignment("a1", "siteB", d(3), d(4));
    expect(b.resourcesOn("siteA", d(1))).toHaveLength(0);
    expect(b.resourcesOn("siteB", d(3)).map((r) => r.key)).toEqual(["machine:m1"]);
  });

  it("unassignById で外せる", () => {
    const b = board().assign("a1", emp, "siteA", d(1), d(3)).unassignById("a1");
    expect(b.assignments).toHaveLength(0);
  });

  it("同一リソースを期間の重なる別現場へ置くと conflicts() が重なり日を検知する", () => {
    const b = board()
      .assign("a1", emp, "siteA", d(2), d(4))
      .assign("a2", emp, "siteB", d(3), d(5));
    const days = b.conflicts().map((c) => c.day.key).sort();
    expect(days).toEqual(["2026-08-03", "2026-08-04"]);
    expect(b.isConflicted(emp, d(3))).toBe(true);
    expect(b.isConflicted(emp, d(2))).toBe(false);
  });

  it("重ならない期間なら重複ではない", () => {
    const b = board()
      .assign("a1", emp, "siteA", d(1), d(2))
      .assign("a2", emp, "siteB", d(4), d(5));
    expect(b.conflicts()).toHaveLength(0);
  });

  it("freeResourcesOn は当日どこにも配置されていないリソースを返す", () => {
    const b = board().assign("a1", emp, "siteA", d(2), d(4));
    expect(b.freeResourcesOn(d(3), [emp, mac]).map((r) => r.key)).toEqual(["machine:m1"]);
    expect(b.freeResourcesOn(d(6), [emp, mac]).map((r) => r.key).sort()).toEqual([
      "employee:e1",
      "machine:m1",
    ]);
  });

  it("coversResource は現場×期間の全日を覆うかを判定する", () => {
    const b = board().assign("a1", mac, "siteA", d(2), d(5));
    expect(b.coversResource(mac, "siteA", DateRange.of(d(3), d(4)))).toBe(true);
    expect(b.coversResource(mac, "siteA", DateRange.of(d(2), d(5)))).toBe(true);
    expect(b.coversResource(mac, "siteA", DateRange.of(d(2), d(6)))).toBe(false); // 6日目が未カバー
    expect(b.coversResource(mac, "siteB", DateRange.of(d(3), d(4)))).toBe(false); // 別現場
  });

  it("freeSpans は未配置（本社にある）連続区間を返す", () => {
    // m1 を siteA に 8/3〜8/4 配置 → 空きは 8/1-8/2 と 8/5-8/7
    const b = board().assign("a1", mac, "siteA", d(3), d(4));
    const spans = b.freeSpans(mac).map((r) => `${r.from.key}..${r.to.key}`);
    expect(spans).toEqual(["2026-08-01..2026-08-02", "2026-08-05..2026-08-07"]);
    // 未配置なら窓全体が1区間
    expect(board().freeSpans(mac).map((r) => `${r.from.key}..${r.to.key}`)).toEqual([
      "2026-08-01..2026-08-07",
    ]);
  });

  it("toPlain / fromPlain で往復できる", () => {
    const b = board()
      .assign("a1", emp, "siteA", d(1), d(2))
      .assign("a2", mac, "siteB", d(3), d(5));
    const restored = PlacementBoard.fromPlain(b.toPlain());
    expect(restored.toPlain()).toEqual(b.toPlain());
  });

  it("旧形式（1日 { ref, siteId, day }）plain を後方互換で読める", () => {
    const restored = PlacementBoard.fromPlain({
      id: "b1",
      from: "2026-08-01",
      to: "2026-08-07",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignments: [{ ref: { kind: "employee", id: "e1" }, siteId: "siteA", day: "2026-08-02" } as any],
    });
    expect(restored.resourcesOn("siteA", d(2)).map((r) => r.key)).toEqual(["employee:e1"]);
  });
});
