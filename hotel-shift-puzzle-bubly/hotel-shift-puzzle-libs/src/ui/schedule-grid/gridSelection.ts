import { cursorAt, positionOf, type CursorLayout } from "./gridCursor.js";
import type { CellSelection, SelectionArea } from "./types.js";

/**
 * gridSelection — 勤務表の範囲選択（純粋関数。#157）
 *
 * 選択は「カーソル＋範囲の集まり」。範囲は Excel と同じ長方形で、起点（anchor＝アクティブセル）と
 * Shift で動く反対の角（extent）で持つ。飛び地（Ctrl/Cmd＋クリック）は範囲を足していく。
 *   - 範囲は同じ種類の場所の中だけ（スタッフ行のセル同士／必要人数のセル同士）
 *   - 行の見出し（全日まとめて）は範囲に入れない。見出しを起点にした範囲は見出し1つのまま
 */

/** 同じセル（居場所）か */
export const sameCell = (a: CellSelection | null, b: CellSelection | null): boolean => {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "staff" && b.kind === "staff") {
    return a.staffId === b.staffId && a.day.key === b.day.key;
  }
  if (a.kind === "required" && b.kind === "required") {
    return a.shiftName === b.shiftName && (a.day?.key ?? null) === (b.day?.key ?? null);
  }
  return false;
};

/** 1セルだけの範囲 */
export const singleArea = (cell: CellSelection): SelectionArea => ({
  anchor: cell,
  extent: cell,
});

const isHead = (cell: CellSelection) => cell.kind === "required" && cell.day === null;

/** 起点の種類の領域（行の範囲）。スタッフ行 or 必要人数の行 */
const rowRangeOf = (anchor: CellSelection, layout: CursorLayout): [number, number] =>
  anchor.kind === "staff"
    ? [0, layout.staffIds.length - 1]
    : [layout.staffIds.length, layout.staffIds.length + layout.requiredShiftNames.length - 1];

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** (行, 列) を起点の領域（その種類の行・日の列）に収めたセル */
const clampedCell = (
  anchor: CellSelection,
  row: number,
  col: number,
  layout: CursorLayout
): CellSelection => {
  const [minRow, maxRow] = rowRangeOf(anchor, layout);
  return cursorAt(clamp(row, minRow, maxRow), clamp(col, 0, layout.days.length - 1), layout);
};

/** extent を dRow 行・dCol 列ぶん動かす（Shift＋矢印）。起点の領域の端で止まる */
export function extendArea(
  area: SelectionArea,
  dRow: number,
  dCol: number,
  layout: CursorLayout
): SelectionArea {
  if (isHead(area.anchor)) return area;
  const extent = positionOf(area.extent, layout);
  if (!extent) return area;
  return {
    anchor: area.anchor,
    extent: clampedCell(area.anchor, extent.row + dRow, extent.col + dCol, layout),
  };
}

/** 起点から target までの範囲（Shift＋クリック・ドラッグ）。領域の外なら起点の領域の端へ寄せる */
export function areaTo(
  anchor: CellSelection,
  target: CellSelection,
  layout: CursorLayout
): SelectionArea {
  if (isHead(anchor)) return singleArea(anchor);
  const position = positionOf(target, layout);
  if (!position) return singleArea(anchor);
  return { anchor, extent: clampedCell(anchor, position.row, position.col, layout) };
}

/** 範囲の長方形（行・列の最小と最大）。表に無い居場所なら undefined */
const rectOf = (area: SelectionArea, layout: CursorLayout) => {
  const a = positionOf(area.anchor, layout);
  const e = positionOf(area.extent, layout);
  if (!a || !e) return undefined;
  return {
    top: Math.min(a.row, e.row),
    bottom: Math.max(a.row, e.row),
    left: Math.min(a.col, e.col),
    right: Math.max(a.col, e.col),
  };
};

/** セルが選択のどれかの範囲に入っているか */
export function isInSelection(
  areas: SelectionArea[],
  cell: CellSelection,
  layout: CursorLayout
): boolean {
  const p = positionOf(cell, layout);
  if (!p) return false;
  return areas.some((area) => {
    const r = rectOf(area, layout);
    return !!r && p.row >= r.top && p.row <= r.bottom && p.col >= r.left && p.col <= r.right;
  });
}

/** 選択中の全セル（重なりは1つにまとめ、表の上から・左から順） */
export function cellsOf(areas: SelectionArea[], layout: CursorLayout): CellSelection[] {
  const seen = new Set<string>();
  const positions: { row: number; col: number }[] = [];
  for (const area of areas) {
    const r = rectOf(area, layout);
    if (!r) continue;
    for (let row = r.top; row <= r.bottom; row++) {
      for (let col = r.left; col <= r.right; col++) {
        const key = `${row}:${col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        positions.push({ row, col });
      }
    }
  }
  positions.sort((a, b) => a.row - b.row || a.col - b.col);
  return positions.map(({ row, col }) => cursorAt(row, col, layout));
}
