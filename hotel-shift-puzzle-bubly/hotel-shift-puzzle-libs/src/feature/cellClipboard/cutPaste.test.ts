import { WorkingDay, type CellPaste, type CopiedCell } from "@bublys-org/hotel-shift-puzzle-model";
import { withCutCleared } from "./cutPaste.js";

describe("withCutCleared（カットを貼ったときに元を空ける）", () => {
  const d = (day: number) => WorkingDay.of(2026, 6, day);
  const early = { kind: "work", shiftId: "early" } as const;
  const cutCells: CopiedCell[] = [
    { staffId: "s1", dayKey: d(1).key, cell: early, shiftName: "早番" },
    { staffId: "s1", dayKey: d(2).key, cell: early, shiftName: "早番" },
  ];
  const labels = (changes: CellPaste[]) =>
    changes.map((c) => `${c.staffId}:${c.day.day}=${c.to.kind === "work" ? c.to.shiftId : c.to.kind}`);

  it("★ 同じ勤務表なら、元を空ける変更と貼る変更を1つにまとめ、重なるセルは貼る値が勝つ", () => {
    // s1 の1〜2日をカットして、1日右へずらして貼る（2日は重なる）
    const changes: CellPaste[] = [
      { staffId: "s1", day: d(2), to: early },
      { staffId: "s1", day: d(3), to: early },
    ];

    const result = withCutCleared({
      changes,
      targetScheduleId: "A",
      cut: { scheduleId: "A", cells: cutCells },
    });

    expect(labels(result.targetChanges)).toEqual(["s1:1=undecided", "s1:2=early", "s1:3=early"]);
    expect(result.sourceClears).toBeUndefined();
  });

  it("別の勤務表なら、貼る先はそのまま、元の勤務表に「元を空ける」を別に返す", () => {
    const changes: CellPaste[] = [{ staffId: "s1", day: d(1), to: early }];

    const result = withCutCleared({
      changes,
      targetScheduleId: "B",
      cut: { scheduleId: "A", cells: cutCells },
    });

    expect(labels(result.targetChanges)).toEqual(["s1:1=early"]);
    expect(result.sourceClears?.scheduleId).toBe("A");
    expect(labels(result.sourceClears?.changes ?? [])).toEqual(["s1:1=undecided", "s1:2=undecided"]);
  });

  it("コピー（カットでない）や、何も貼れなかったときは元を空けない", () => {
    const changes: CellPaste[] = [{ staffId: "s2", day: d(1), to: early }];

    expect(withCutCleared({ changes, targetScheduleId: "A" }).targetChanges).toEqual(changes);
    expect(
      withCutCleared({ changes: [], targetScheduleId: "A", cut: { scheduleId: "A", cells: cutCells } })
    ).toEqual({ targetChanges: [] });
  });
});
