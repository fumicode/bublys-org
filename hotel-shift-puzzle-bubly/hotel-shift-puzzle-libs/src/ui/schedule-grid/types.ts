import type { ShiftCell, WorkingDay } from "../../domain/index.js";

/**
 * キーボード操作のカーソル（勤務表の中の居場所）。**カーソルは1つ**で、居場所の種類が違うだけ。
 *   - staff    : スタッフ行のセル（どのスタッフ・どの日か）
 *   - required : 必要人数の行のセル（どの勤務帯・どの日か）。day が null なら行の見出し＝全日まとめて
 * 範囲選択（#157）はこのカーソルの上に SelectionArea の集まりとして重ねる。
 */
export type CellSelection =
  | { kind: "staff"; staffId: string; day: WorkingDay }
  | { kind: "required"; shiftName: string; day: WorkingDay | null };

/**
 * 範囲選択の1つの長方形（#157）。anchor は起点（Excel のアクティブセル）、extent は Shift で動く反対の角。
 * 必ず同じ種類の場所の中に収まる（gridSelection）。
 */
export type SelectionArea = { anchor: CellSelection; extent: CellSelection };

/** スタッフ行のセル1つへの入力 */
export type CellChange = { staffId: string; day: WorkingDay; to: ShiftCell };

/** 必要人数のセル1つへの入力。day が null なら全日まとめて（行の見出し） */
export type RequiredChange = { shiftName: string; day: WorkingDay | null; count: number };

/** 必要人数編集メニューの対象。day=null は「全稼働日に一括」 */
export type EditingRequired = {
  anchor: HTMLElement;
  shiftName: string;
  day: WorkingDay | null;
  current: number;
};
