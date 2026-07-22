import { ScheduleForecast } from "./ScheduleForecast.js";

describe("ScheduleForecast", () => {
  it("cacheKey は基点・セル・バージョンを結合する", () => {
    expect(
      ScheduleForecast.cacheKey({
        scheduleId: "sched-1",
        baseNodeId: "node-a",
        staffId: "s1",
        dayKey: "2026-06-01",
        version: "1",
      })
    ).toBe("sched-1:node-a:s1:2026-06-01:1");
  });

  it("nodeLabel を encode/parse できる", () => {
    const label = ScheduleForecast.nodeLabel({
      kind: "decision",
      cacheKey: "sched-1:node-a:s1:2026-06-01:1",
      intent: "wish-first",
      displayLabel: "田中 1日 希望優先",
    });
    expect(label).toContain("[decision|");
    expect(label).toContain("wish-first]");
    expect(ScheduleForecast.parseNodeLabel(label)).toEqual({
      kind: "decision",
      cacheKey: "sched-1:node-a:s1:2026-06-01:1",
      intent: "wish-first",
      displayLabel: "田中 1日 希望優先",
    });
  });

  it("通常の確定ラベルは parse しない", () => {
    expect(ScheduleForecast.parseNodeLabel("確定: 2026年6月")).toBeNull();
    expect(ScheduleForecast.parseNodeLabel(undefined)).toBeNull();
  });

  it("toPlain / fromPlain は往復できる", () => {
    const forecast = new ScheduleForecast({
      id: "sched-1:node-a:s1:2026-06-01:1:constraint-safe",
      version: "1",
      scheduleId: "sched-1",
      baseNodeId: "node-a",
      staffId: "s1",
      dayKey: "2026-06-01",
      intent: "constraint-safe",
      decision: { kind: "work", shiftId: "early" },
      before: {
        violationCount: 1,
        concessionCount: 0,
        staffingGap: 2,
        undecidedCount: 5,
        wishSatisfiedCount: 0,
      },
      afterDecision: {
        violationCount: 1,
        concessionCount: 0,
        staffingGap: 1,
        undecidedCount: 4,
        wishSatisfiedCount: 1,
      },
      projected: {
        violationCount: 0,
        concessionCount: 0,
        staffingGap: 0,
        undecidedCount: 0,
        wishSatisfiedCount: 2,
      },
      risk: "safe",
      reasons: ["制約の安全性を優先"],
    });
    expect(ScheduleForecast.fromPlain(forecast.toPlain()).state).toEqual(
      forecast.state
    );
  });
});
