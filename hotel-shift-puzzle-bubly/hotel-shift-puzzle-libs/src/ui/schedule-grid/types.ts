import type { WorkingDay } from "../../domain/index.js";

/**
 * キーボード操作でフォーカス中のセル（どのスタッフ・どの日か）。
 * いずれ「稼働日」や「スタッフ」など範囲選択へ広げる想定で、
 * まずは 1 セル分の選択としてここに置く。
 */
export type CellSelection = {
  staffId: string;
  day: WorkingDay;
};

/** 必要人数編集メニューの対象。day=null は「全稼働日に一括」 */
export type EditingRequired = {
  anchor: HTMLElement;
  shiftName: string;
  day: WorkingDay | null;
  current: number;
};
