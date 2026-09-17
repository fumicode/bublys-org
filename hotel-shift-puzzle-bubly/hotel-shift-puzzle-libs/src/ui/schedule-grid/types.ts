import type { WorkingDay } from "../../domain/index.js";

/**
 * キーボード操作のカーソル（勤務表の中の居場所）。**カーソルは1つ**で、居場所の種類が違うだけ。
 *   - staff    : スタッフ行のセル（どのスタッフ・どの日か）
 *   - required : 必要人数の行のセル（どの勤務帯・どの日か）。day が null なら行の見出し＝全日まとめて
 * いずれ範囲選択へ広げる想定で、まずは 1 セル分の選択としてここに置く。
 */
export type CellSelection =
  | { kind: "staff"; staffId: string; day: WorkingDay }
  | { kind: "required"; shiftName: string; day: WorkingDay | null };

/** 必要人数編集メニューの対象。day=null は「全稼働日に一括」 */
export type EditingRequired = {
  anchor: HTMLElement;
  shiftName: string;
  day: WorkingDay | null;
  current: number;
};
