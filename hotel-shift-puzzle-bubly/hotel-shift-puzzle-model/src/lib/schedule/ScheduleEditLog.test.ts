import {
  ScheduleEditLog,
  computeConstraintDelta,
  emptyConstraintDelta,
  violationIdentityKey,
} from "./ScheduleEditLog.js";
import { ConstraintViolation } from "./ConstraintViolation.js";
import { WorkingDay } from "./WorkingDay.js";

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
        constraintDelta: {
          newlyViolated: [
            {
              constraintType: "max-consecutive-workdays",
              staffId: "s1",
              dayKeys: ["2026-06-01"],
              message: "6連勤",
            },
          ],
          newlyResolved: [],
          concessions: [
            {
              constraintType: "max-consecutive-workdays",
              staffId: "s1",
              dayKeys: ["2026-06-01"],
              message: "6連勤",
            },
          ],
        },
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
});

describe("computeConstraintDelta", () => {
  const day = WorkingDay.fromKey("2026-06-01");

  it("新規のスタッフ紐づき違反を concessions に入れる", () => {
    const before: ConstraintViolation[] = [];
    const after = [
      new ConstraintViolation({
        constraintType: "max-consecutive-workdays",
        staffId: "s1",
        days: [day],
        message: "6連勤（上限5連勤）",
      }),
    ];
    const delta = computeConstraintDelta(before, after);
    expect(delta.newlyViolated).toHaveLength(1);
    expect(delta.newlyResolved).toHaveLength(0);
    expect(delta.concessions).toHaveLength(1);
    expect(delta.concessions[0].staffId).toBe("s1");
  });

  it("日単位違反は newlyViolated には入るが concessions には入れない", () => {
    const after = [
      new ConstraintViolation({
        constraintType: "shift-leader",
        days: [day],
        message: "早責不足",
      }),
    ];
    const delta = computeConstraintDelta([], after);
    expect(delta.newlyViolated).toHaveLength(1);
    expect(delta.concessions).toHaveLength(0);
  });

  it("解消された違反を newlyResolved に入れる", () => {
    const before = [
      new ConstraintViolation({
        constraintType: "min-monthly-day-off",
        staffId: "s1",
        days: [],
        message: "休日不足",
      }),
    ];
    const delta = computeConstraintDelta(before, []);
    expect(delta.newlyResolved).toHaveLength(1);
    expect(delta.newlyViolated).toHaveLength(0);
  });

  it("violationIdentityKey は plain から安定キーを返す", () => {
    expect(
      violationIdentityKey({
        constraintType: "x",
        staffId: "s",
        dayKeys: ["a", "b"],
        message: "m",
      })
    ).toBe("x:s:a_b");
  });
});
