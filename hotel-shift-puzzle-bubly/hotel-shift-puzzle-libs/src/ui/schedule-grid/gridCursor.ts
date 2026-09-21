import type { WorkingDay } from "../../domain/index.js";
import type { CellSelection } from "./types.js";

/**
 * gridCursor — 勤務表のキーボードカーソルをどこへ動かすか（純粋関数）
 *
 * 表を「スタッフ行 → 必要人数の行」の1本の縦並びとして扱う（Excel と同じく表はひと続き）。
 *   - 行：スタッフ行（上）に続けて、必要人数を入力できる勤務帯の行（下）。責任者の ◯/✕ 行や
 *         休みの人数行は並べない＝カーソルは飛ばす（入力できるセルにだけ止まる）
 *   - 列：スタッフ行は日だけ。必要人数の行は、行の見出し（全日まとめて。列 -1）＋日
 *   - 端ではクランプして留まる
 */
export type CursorLayout = {
  /** スタッフ行の並び（表示順） */
  staffIds: string[];
  /** 必要人数を入力できる勤務帯の行の並び（勤務帯名）。入力できない表示なら空 */
  requiredShiftNames: string[];
  /** 列の並び（稼働日） */
  days: WorkingDay[];
};

/** 行の見出し（全日まとめて）の列番号 */
export const HEAD_COL = -1;

/** (行, 列) の位置にあるカーソル */
export const cursorAt = (row: number, col: number, layout: CursorLayout): CellSelection => {
  const { staffIds, requiredShiftNames, days } = layout;
  if (row < staffIds.length) {
    return { kind: "staff", staffId: staffIds[row], day: days[Math.max(col, 0)] };
  }
  return {
    kind: "required",
    shiftName: requiredShiftNames[row - staffIds.length],
    day: col === HEAD_COL ? null : days[col],
  };
};

/** カーソルの (行, 列)。表に無い居場所なら undefined */
export const positionOf = (
  cursor: CellSelection,
  layout: CursorLayout
): { row: number; col: number } | undefined => {
  const { staffIds, requiredShiftNames, days } = layout;
  const colOf = (day: WorkingDay | null) =>
    day === null ? HEAD_COL : days.findIndex((d) => d.key === day.key);

  if (cursor.kind === "staff") {
    const row = staffIds.indexOf(cursor.staffId);
    const col = colOf(cursor.day);
    return row < 0 || col < 0 ? undefined : { row, col };
  }
  const index = requiredShiftNames.indexOf(cursor.shiftName);
  const col = colOf(cursor.day);
  return index < 0 || (col < 0 && col !== HEAD_COL)
    ? undefined
    : { row: staffIds.length + index, col };
};

/**
 * カーソルを dRow 行・dCol 列ぶん動かす。
 * カーソルが無い（または表から消えた）ときは、表の左上のセルに置く。表が空なら今のまま。
 */
export function moveCursor(
  cursor: CellSelection | null,
  dRow: number,
  dCol: number,
  layout: CursorLayout
): CellSelection | null {
  const rowCount = layout.staffIds.length + layout.requiredShiftNames.length;
  if (rowCount === 0 || layout.days.length === 0) return cursor;

  const position = cursor ? positionOf(cursor, layout) : undefined;
  if (!position) return cursorAt(0, 0, layout);

  const row = Math.min(Math.max(position.row + dRow, 0), rowCount - 1);
  // 見出しの列は必要人数の行にしか無い。スタッフ行へ上がったら1日目に寄せる
  const minCol = row < layout.staffIds.length ? 0 : HEAD_COL;
  const col = Math.min(Math.max(position.col + dCol, minCol), layout.days.length - 1);
  return cursorAt(row, col, layout);
}
