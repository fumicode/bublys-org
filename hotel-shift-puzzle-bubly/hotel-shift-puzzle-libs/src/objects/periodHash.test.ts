/**
 * 期（SchedulePeriod）を入れても、ホテルの勤務表・確定版の内容ハッシュが変わらないことの見張り。
 *
 * 世界の同一性は載っているオブジェクトのハッシュで決まる（打ち消しスナップ）。期を入れる前に
 * 保存された勤務表を読んで書き戻したときにハッシュがずれると、同じ状態へ戻しても
 * 元のノードへ戻れなくなる。画面には何も出ないので、ここで落ちるようにしておく。
 */
import { describe, expect, test } from "vitest";
import { computeStateHash } from "@bublys-org/world-line-graph";
import { HOTEL_OBJECTS } from "./hotelObjects.js";

/** 記述子の codec で読んで書き戻す（保存 → 読み込み → 保存と同じ道） */
const roundTrip = (codec: { toJSON: (o: never) => unknown; fromJSON: (j: unknown) => unknown }, json: unknown) =>
  codec.toJSON(codec.fromJSON(JSON.parse(JSON.stringify(json))) as never);

describe("期を入れる前のホテルのデータは、読んで書き戻しても同じハッシュになる", () => {
  test("勤務表", () => {
    const legacy = {
      id: "sched-1",
      storeId: "store-1",
      year: 2026,
      month: 6,
      workingStaffGroupId: "sched-1",
      constraintSetId: "sched-1",
      assignments: [
        { staffId: "A", day: { year: 2026, month: 6, day: 1 }, shift: "early" },
        { staffId: "B", day: { year: 2026, month: 6, day: 2 }, shift: "day-off" },
      ],
      requiredStaffing: { byDay: { "2026-06-01": { 早番: 2 } } },
      precedingTail: {
        source: { scheduleId: "prev", worldLineNodeId: "node" },
        confirmedAt: 1,
        days: [{ year: 2026, month: 5, day: 31 }],
        cells: [{ staffId: "A", day: { year: 2026, month: 5, day: 31 }, value: { kind: "day-off" } }],
      },
    };
    const codec = HOTEL_OBJECTS.Schedule.serialize;
    expect(computeStateHash(roundTrip(codec, legacy))).toBe(computeStateHash(legacy));
  });

  test("確定版", () => {
    const legacy = {
      id: "store-1:2026-06",
      scheduleId: "sched-1",
      worldLineNodeId: "node",
      year: 2026,
      month: 6,
      storeId: "store-1",
      title: "2026年6月",
      compromises: [{ staffId: "A", label: "希望", dayKeys: ["2026-06-03"], message: "…" }],
      busyDayContributions: [{ dayKey: "2026-06-05", requiredCount: 4, workedStaffIds: ["A"] }],
      stars: [{ staffId: "A", compromiseCount: 1, busyDayCount: 1, score: 3 }],
      considerationNotes: { A: "メモ" },
      compromiseWeight: 2,
      busyDayWeight: 1,
      confirmedAt: 1_780_000_000_000,
    };
    const codec = HOTEL_OBJECTS.ScheduleReport.serialize;
    expect(computeStateHash(roundTrip(codec, legacy))).toBe(computeStateHash(legacy));
  });
});
