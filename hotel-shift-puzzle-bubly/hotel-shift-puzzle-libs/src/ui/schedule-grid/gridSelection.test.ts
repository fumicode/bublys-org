import { WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import type { CursorLayout } from "./gridCursor.js";
import {
  areaTo,
  cellsOf,
  extendArea,
  isInSelection,
  sameCell,
  singleArea,
} from "./gridSelection.js";
import type { CellSelection } from "./types.js";

/**
 * 勤務表の範囲選択（#157）。Excel と同じ長方形で、起点（アクティブセル）は動かさずに反対の角を動かす。
 * 範囲は同じ種類の場所の中だけ。行の見出し（全日まとめて）は範囲に入れない。
 */
describe("gridSelection（勤務表の範囲選択）", () => {
  const days = [1, 2, 3, 4].map((d) => WorkingDay.of(2026, 6, d));
  const layout: CursorLayout = {
    staffIds: ["s1", "s2", "s3"],
    requiredShiftNames: ["早番", "遅番"],
    days,
  };
  const staff = (staffId: string, d: number): CellSelection => ({
    kind: "staff",
    staffId,
    day: days[d - 1],
  });
  const required = (shiftName: string, d: number | null): CellSelection => ({
    kind: "required",
    shiftName,
    day: d === null ? null : days[d - 1],
  });
  /** 選択中の全セルを「s1:2」「早番:全日」の形で並べる */
  const labels = (cells: CellSelection[]) =>
    cells.map((c) =>
      c.kind === "staff" ? `${c.staffId}:${c.day.day}` : `${c.shiftName}:${c.day?.day ?? "全日"}`
    );

  it("★ Shift＋→→↓ で 2行×3列になり、Shift＋← で狭まる。起点は動かない", () => {
    let area = singleArea(staff("s1", 1));
    area = extendArea(area, 0, 1, layout);
    area = extendArea(area, 0, 1, layout);
    area = extendArea(area, 1, 0, layout);

    expect(area.anchor).toEqual(staff("s1", 1));
    expect(labels(cellsOf([area], layout))).toEqual([
      "s1:1", "s1:2", "s1:3",
      "s2:1", "s2:2", "s2:3",
    ]);

    area = extendArea(area, 0, -1, layout);
    expect(labels(cellsOf([area], layout))).toEqual(["s1:1", "s1:2", "s2:1", "s2:2"]);
  });

  it("起点をまたいで反対側へも広がる（左上へ）", () => {
    const area = extendArea(extendArea(singleArea(staff("s2", 2)), -1, 0, layout), 0, -1, layout);
    expect(labels(cellsOf([area], layout))).toEqual(["s1:1", "s1:2", "s2:1", "s2:2"]);
  });

  it("スタッフ行の範囲は、必要人数の行へは出ない", () => {
    const area = extendArea(singleArea(staff("s3", 1)), 1, 0, layout);
    expect(area.extent).toEqual(staff("s3", 1));
  });

  it("必要人数の行の範囲は、スタッフ行へも見出しへも出ない", () => {
    let area = singleArea(required("早番", 1));
    area = extendArea(area, -1, 0, layout);
    area = extendArea(area, 0, -1, layout);
    expect(area.extent).toEqual(required("早番", 1));

    area = extendArea(area, 1, 1, layout);
    expect(labels(cellsOf([area], layout))).toEqual(["早番:1", "早番:2", "遅番:1", "遅番:2"]);
  });

  it("見出しを起点にした範囲は、見出し1つのまま", () => {
    const head = singleArea(required("早番", null));
    expect(extendArea(head, 0, 1, layout)).toBe(head);
    expect(areaTo(required("早番", null), required("遅番", 3), layout)).toEqual(head);
  });

  it("Shift＋クリック・ドラッグ：起点から target まで。領域の外は起点の領域の端へ寄せる", () => {
    expect(labels(cellsOf([areaTo(staff("s1", 1), staff("s2", 2), layout)], layout))).toEqual([
      "s1:1", "s1:2", "s2:1", "s2:2",
    ]);
    // スタッフ行の起点から必要人数のセルへ → 一番下のスタッフ行で止まる
    expect(areaTo(staff("s2", 1), required("遅番", 2), layout).extent).toEqual(staff("s3", 2));
  });

  it("飛び地を足しても、重なりは1つにまとめ、表の上から・左から順に並ぶ", () => {
    const areas = [
      areaTo(staff("s2", 2), staff("s3", 3), layout),
      singleArea(staff("s1", 4)),
      singleArea(staff("s2", 3)), // 最初の範囲と重なる
    ];
    expect(labels(cellsOf(areas, layout))).toEqual([
      "s1:4", "s2:2", "s2:3", "s3:2", "s3:3",
    ]);
    expect(isInSelection(areas, staff("s1", 4), layout)).toBe(true);
    expect(isInSelection(areas, staff("s1", 3), layout)).toBe(false);
  });

  it("sameCell：種類・人（勤務帯）・日がそろえば同じセル", () => {
    expect(sameCell(staff("s1", 1), { kind: "staff", staffId: "s1", day: WorkingDay.of(2026, 6, 1) })).toBe(true);
    expect(sameCell(required("早番", null), required("早番", null))).toBe(true);
    expect(sameCell(required("早番", 1), required("早番", null))).toBe(false);
    expect(sameCell(staff("s1", 1), null)).toBe(false);
  });
});
