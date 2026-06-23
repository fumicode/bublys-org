import type { WorkingDay } from "../../domain/index.js";

/** セル編集メニューの対象（どのスタッフ・どの日のセルを編集中か） */
export type EditingCell = {
  anchor: HTMLElement;
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
