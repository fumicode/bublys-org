/**
 * cutPaste — カットを貼るときに「元を空ける」変更を組み立てる（純粋関数。#166）
 *
 * カットは Excel と同じく、貼るまでは何も変えず、**貼ったときに元を未定に戻す**。
 *   - 同じ勤務表 : 元を空ける変更と貼る変更を1つにまとめる（1回の操作＝世界線の1ノード）。
 *                  重なるセルは貼る値が勝つ
 *   - 別の勤務表 : 貼る先はそのまま。元の勤務表には「元を空ける」だけを別に記録する
 * 何も貼れなかったときは元も空けない（カットした値が消えるだけになるため）。
 */
import {
  WorkingDay,
  type CellPaste,
  type CopiedCell,
} from "@bublys-org/hotel-shift-puzzle-model";

export type CutPasteResult = {
  /** 貼り付け先の勤務表に記録する変更 */
  targetChanges: CellPaste[];
  /** 別の勤務表からのカットなら、元の勤務表に記録する「元を空ける」変更 */
  sourceClears?: { scheduleId: string; changes: CellPaste[] };
};

const keyOf = (staffId: string, dayKey: string) => `${staffId}:${dayKey}`;

export function withCutCleared(args: {
  /** 貼る変更（planValuePaste / planObjectPaste の結果） */
  changes: CellPaste[];
  /** 貼り付け先の勤務表 */
  targetScheduleId: string;
  /** カットの中身（カットでなければ undefined） */
  cut?: { scheduleId: string; cells: readonly CopiedCell[] };
}): CutPasteResult {
  const { changes, targetScheduleId, cut } = args;
  if (!cut || changes.length === 0) return { targetChanges: changes };

  const clears: CellPaste[] = cut.cells.map((c) => ({
    staffId: c.staffId,
    day: WorkingDay.fromKey(c.dayKey),
    to: { kind: "undecided" },
  }));

  if (cut.scheduleId !== targetScheduleId) {
    return {
      targetChanges: changes,
      sourceClears: { scheduleId: cut.scheduleId, changes: clears },
    };
  }

  // 同じ勤務表：元を空けてから貼る（重なるセルは貼る値が勝つ）
  const pasted = new Set(changes.map((c) => keyOf(c.staffId, c.day.key)));
  return {
    targetChanges: [
      ...clears.filter((c) => !pasted.has(keyOf(c.staffId, c.day.key))),
      ...changes,
    ],
  };
}
