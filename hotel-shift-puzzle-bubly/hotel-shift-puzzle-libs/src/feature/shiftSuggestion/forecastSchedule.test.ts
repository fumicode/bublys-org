import {
  MonthlyStaffSchedule,
  Staff,
  WorkShift,
  WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { buildScheduleForecasts } from "./forecastSchedule.js";
import type { PolicyShiftSuggestion } from "./types.js";

describe("buildScheduleForecasts", () => {
  const day = WorkingDay.of(2026, 6, 1);
  const schedule = MonthlyStaffSchedule.create({
    id: "sched-1",
    storeId: "store-1",
    year: 2026,
    month: 6,
  }).setRequired(day, "早番", 1);
  const staff = new Staff({ id: "s1", name: "田中", department: "フロント" });
  const early = WorkShift.of("early", "早番", { hour: 7 });
  const late = WorkShift.of("late", "遅番", { hour: 15 });

  const suggestions: PolicyShiftSuggestion[] = [
    {
      id: "s1:2026-06-01:work:early",
      cell: { kind: "work", shiftId: "early" },
      score: 20,
      reasons: ["希望に一致", "人手不足を埋める"],
      wouldConcede: false,
    },
    {
      id: "s1:2026-06-01:day-off",
      cell: { kind: "day-off" },
      score: 5,
      reasons: ["休み"],
      wouldConcede: false,
    },
    {
      id: "s1:2026-06-01:work:late",
      cell: { kind: "work", shiftId: "late" },
      score: 8,
      reasons: [],
      wouldConcede: true,
    },
  ];

  it("意図ごとの意味ある枝を最大3つ返す", () => {
    const built = buildScheduleForecasts({
      schedule,
      baseNodeId: "node-root",
      staffId: "s1",
      day,
      suggestions,
      constraints: [],
      staffList: [staff],
      workShifts: [early, late],
      wishByStaff: new Map(),
    });

    expect(built.length).toBeGreaterThan(0);
    expect(built.length).toBeLessThanOrEqual(3);
    const intents = built.map((b) => b.forecast.intent);
    expect(new Set(intents).size).toBe(intents.length);
    for (const item of built) {
      expect(item.decisionSchedule.statusOf("s1", day)).toEqual(
        item.forecast.decision
      );
      expect(item.forecast.state.baseNodeId).toBe("node-root");
      expect(item.forecast.reasons.length).toBeGreaterThan(0);
      expect(item.forecast.id).toContain("sched-1:node-root:s1:2026-06-01:1:");
    }
  });

    it("未定候補は枝に入れない", () => {
    const built = buildScheduleForecasts({
      schedule,
      baseNodeId: "node-root",
      staffId: "s1",
      day,
      suggestions: [
        {
          id: "undecided",
          cell: { kind: "undecided" },
          score: 100,
          reasons: [],
          wouldConcede: false,
        },
        suggestions[0],
      ],
      constraints: [],
      staffList: [staff],
      workShifts: [early, late],
      wishByStaff: new Map(),
    });
    expect(
      built.every((b) => b.forecast.decision.kind !== "undecided")
    ).toBe(true);
  });

  it("評価する候補数に上限がある", () => {
    const many: PolicyShiftSuggestion[] = Array.from({ length: 12 }, (_, i) => ({
      id: `cand-${i}`,
      cell: {
        kind: "work" as const,
        shiftId: i % 2 === 0 ? "early" : "late",
      },
      score: 20 - i,
      reasons: [],
      wouldConcede: false,
    }));
    const built = buildScheduleForecasts({
      schedule,
      baseNodeId: "node-root",
      staffId: "s1",
      day,
      suggestions: many,
      constraints: [],
      staffList: [staff],
      workShifts: [early, late],
      wishByStaff: new Map(),
    });
    expect(built.length).toBeLessThanOrEqual(3);
  });
});
