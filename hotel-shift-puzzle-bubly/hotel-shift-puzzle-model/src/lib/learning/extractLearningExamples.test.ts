import { MonthlyStaffSchedule } from "../schedule/MonthlyStaffSchedule.js";
import { WorkingDay } from "../schedule/WorkingDay.js";
import { ScheduleEditLog, emptyConstraintDelta } from "../schedule/ScheduleEditLog.js";
import {
  extractLearningExamples,
  type LearningWorldSnapshot,
} from "./extractLearningExamples.js";
import { shiftCellKey } from "./ShiftLearningExample.js";

describe("extractLearningExamples", () => {
  const day = WorkingDay.of(2026, 6, 1);
  const scheduleId = "sched-1";

  const emptySchedule = () =>
    MonthlyStaffSchedule.create({
      id: scheduleId,
      storeId: "store-A",
      year: 2026,
      month: 6,
    });

  it("親→子で新規 setCell entry から学習例を1件作る", () => {
    const root = emptySchedule();
    const after = root.setCell("s1", day, { kind: "work", shiftId: "early" });
    const rootLog = ScheduleEditLog.empty(scheduleId);
    const childLog = rootLog.append({
      actor: "human",
      kind: "setCell",
      summary: "田中 / 1日 → early",
      targets: { staffId: "s1", dayKey: day.key, shiftId: "early" },
      constraintDelta: emptyConstraintDelta(),
      source: "manual",
    });

    const snapshots: LearningWorldSnapshot[] = [
      {
        nodeId: "n0",
        parentNodeId: null,
        schedule: root,
        editLog: rootLog,
      },
      {
        nodeId: "n1",
        parentNodeId: "n0",
        schedule: after,
        editLog: childLog,
      },
    ];

    const examples = extractLearningExamples(scheduleId, snapshots);
    expect(examples).toHaveLength(1);
    expect(examples[0].context.staffId).toBe("s1");
    expect(examples[0].context.dayKey).toBe(day.key);
    expect(examples[0].context.cellBefore).toEqual({ kind: "undecided" });
    expect(shiftCellKey(examples[0].action.cellAfter)).toBe("work:early");
    expect(examples[0].action.actor).toBe("human");
    expect(examples[0].worldLineNodeId).toBe("n1");
    expect(examples[0].action.source).toBe("manual");
  });

  it("譲歩付き entry は hadConcession が true", () => {
    const root = emptySchedule();
    const after = root.setCell("s1", day, { kind: "work", shiftId: "early" });
    const childLog = ScheduleEditLog.empty(scheduleId).append({
      actor: "human",
      kind: "setCell",
      summary: "x",
      targets: { staffId: "s1", dayKey: day.key, shiftId: "early" },
      constraintDelta: {
        newlyViolated: [
          {
            constraintType: "max-consecutive-workdays",
            staffId: "s1",
            dayKeys: [day.key],
            message: "6連勤",
          },
        ],
        newlyResolved: [],
        concessions: [
          {
            constraintType: "max-consecutive-workdays",
            staffId: "s1",
            dayKeys: [day.key],
            message: "6連勤",
          },
        ],
      },
    });

    const examples = extractLearningExamples(scheduleId, [
      {
        nodeId: "n0",
        parentNodeId: null,
        schedule: root,
        editLog: ScheduleEditLog.empty(scheduleId),
      },
      {
        nodeId: "n1",
        parentNodeId: "n0",
        schedule: after,
        editLog: childLog,
      },
    ]);

    expect(examples[0].action.hadConcession).toBe(true);
    expect(examples[0].action.concessionTypes).toEqual([
      "max-consecutive-workdays",
    ]);
  });

  it("setCell 以外は既定で抽出しない", () => {
    const root = emptySchedule();
    const log = ScheduleEditLog.empty(scheduleId).append({
      actor: "auto",
      kind: "autoStep",
      summary: "希望を叶える",
      targets: { stepId: "fulfill-wishes" },
      constraintDelta: emptyConstraintDelta(),
    });
    const examples = extractLearningExamples(scheduleId, [
      {
        nodeId: "n0",
        parentNodeId: null,
        schedule: root,
        editLog: ScheduleEditLog.empty(scheduleId),
      },
      {
        nodeId: "n1",
        parentNodeId: "n0",
        schedule: root,
        editLog: log,
      },
    ]);
    expect(examples).toHaveLength(0);
  });
});
