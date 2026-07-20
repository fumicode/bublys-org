/**
 * ShiftLearningExample — シフト作成操作から抽出する学習例（1操作 = 1例）
 *
 * 世界線ノード列と ScheduleEditLog から復元する。domain 純粋（React/Redux 不要）。
 * セル編集（setCell）が主対象。autoStep / candidate も kind で区別して残す。
 */
import type { ConstraintViolationPlain } from "../schedule/ConstraintViolation.js";
import type { ShiftCell } from "../schedule/MonthlyStaffSchedule.js";
import type {
  ScheduleEditActor,
  ScheduleEditKind,
  ScheduleEditEntryPlain,
} from "../schedule/ScheduleEditLog.js";
import type { DecodedWish } from "../schedule/autoShiftStep.js";

/** 操作前の文脈（特徴量の元） */
export type ShiftLearningContext = {
  year: number;
  month: number;
  storeId: string;
  staffId: string;
  dayKey: string;
  cellBefore: ShiftCell;
  violationsBefore: ConstraintViolationPlain[];
  /** デコード済み希望。未解決時は省略 */
  wish?: DecodedWish;
  /** 候補勤務帯に入れるか（可能勤務帯）。不明時 true */
  availabilityOk: boolean;
  /** その日・対象勤務帯の不足人数（正=不足）。休み提案時は省略可 */
  requiredStaffingGap?: number;
  /** 紐づけレポート由来の貢献度スコア */
  linkedReportScore?: number;
  /** 繁忙日か */
  isBusyDay?: boolean;
};

/** ラベル（人が選んだ／自動が適用した操作） */
export type ShiftLearningAction = {
  cellAfter: ShiftCell;
  actor: ScheduleEditActor;
  hadConcession: boolean;
  concessionTypes: string[];
  /** 提案採用/拒否メタ（あれば） */
  source?: ScheduleEditEntryPlain["source"];
  suggestionId?: string;
  rejectedSuggestionId?: string;
};

export type ShiftLearningExample = {
  scheduleId: string;
  worldLineNodeId: string;
  entryId: string;
  context: ShiftLearningContext;
  action: ShiftLearningAction;
  at: string;
  kind: ScheduleEditKind;
};

/** ShiftCell を JSON 比較可能なキーにする */
export function shiftCellKey(cell: ShiftCell): string {
  if (cell.kind === "work") return `work:${cell.shiftId}`;
  return cell.kind;
}

export function shiftCellsEqual(a: ShiftCell, b: ShiftCell): boolean {
  return shiftCellKey(a) === shiftCellKey(b);
}
