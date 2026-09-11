import { ScheduleEditLog } from "./ScheduleEditLog.js";
import { ScheduleEditEntry } from "./ScheduleEditEntry.js";
import { ConstraintDelta, emptyConstraintDelta } from "./ConstraintDelta.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { WorkingDay } from "./WorkingDay.js";

const concession = () =>
  new ConstraintViolation({
    constraintType: "max-consecutive-workdays",
    staffId: "s1",
    days: [WorkingDay.fromKey("2026-06-01")],
    message: "6連勤",
  });

describe("ScheduleEditLog", () => {
  it("empty は entries が空", () => {
    const log = ScheduleEditLog.empty("sched-1");
    expect(log.id).toBe("sched-1");
    expect(log.entries).toEqual([]);
    expect(log.latest).toBeUndefined();
  });

  it("append は新インスタンスを返し entries を増やす", () => {
    const log = ScheduleEditLog.empty("sched-1");
    const next = log.append({
      actor: "human",
      kind: "setCell",
      summary: "田中 / 1日 → 早番",
      targets: { staffId: "s1", dayKey: "2026-06-01" },
      constraintDelta: emptyConstraintDelta(),
    });
    expect(log.entries).toHaveLength(0);
    expect(next.entries).toHaveLength(1);
    expect(next.latest).toBeInstanceOf(ScheduleEditEntry);
    expect(next.latest?.summary).toBe("田中 / 1日 → 早番");
    expect(next.latest?.id).toBeTruthy();
    expect(next.latest?.at).toBeTruthy();
  });

  it("entriesWithConcessions は譲歩のあるものだけ返す", () => {
    const withConcession = ScheduleEditLog.empty("s")
      .append({
        actor: "human",
        kind: "setCell",
        summary: "a",
        targets: {},
        constraintDelta: ConstraintDelta.between([], [concession()]),
      })
      .append({
        actor: "auto",
        kind: "autoStep",
        summary: "b",
        targets: { stepId: "fulfill-wishes" },
        constraintDelta: emptyConstraintDelta(),
      });
    expect(withConcession.entriesWithConcessions()).toHaveLength(1);
    expect(withConcession.entriesWithConcessions()[0].summary).toBe("a");
  });

  it("state はエントリをインスタンスで持つ（保存形は toPlain で別に作る）", () => {
    const log = ScheduleEditLog.empty("s").append({
      actor: "human",
      kind: "setCell",
      summary: "a",
      targets: {},
      constraintDelta: ConstraintDelta.between([], [concession()]),
    });

    expect(log.state.entries[0]).toBeInstanceOf(ScheduleEditEntry);
    expect(() => JSON.stringify(log.toPlain())).not.toThrow();
    expect(log.toPlain().entries[0].constraintDelta.concessions[0].dayKeys).toEqual([
      "2026-06-01",
    ]);
  });

  it("toPlain / fromPlain で入れ子まで plain ↔ インスタンスを往復できる", () => {
    const original = ScheduleEditLog.empty("s").append({
      actor: "human",
      kind: "setCell",
      summary: "a",
      targets: { staffId: "s1" },
      constraintDelta: ConstraintDelta.between([], [concession()]),
    });

    const restored = ScheduleEditLog.fromPlain(
      JSON.parse(JSON.stringify(original.toPlain()))
    );

    expect(restored.state.entries[0]).toBeInstanceOf(ScheduleEditEntry);
    expect(restored.latest?.constraintDelta).toBeInstanceOf(ConstraintDelta);
    expect(restored.latest?.constraintDelta.concessions[0]).toBeInstanceOf(
      ConstraintViolation
    );
    expect(restored.entriesWithConcessions()).toHaveLength(1);
    expect(restored.toPlain()).toEqual(original.toPlain());
  });
});
