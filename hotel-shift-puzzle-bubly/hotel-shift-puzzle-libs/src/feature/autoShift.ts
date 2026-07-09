/**
 * 自動シフト（段階的ステップ）の feature 層アダプタ。
 *
 * ドメインの各ステップ（model 層の AutoShiftStep）は希望の「オプションキー」の意味を知らない。
 * ここで shiftWishOptions の規約に従って希望をデコードし、可能勤務帯（ScheduleAvailability）を
 * 述語に変換して AutoShiftContext を組み、ステップへ渡す。希望キーの解釈はこの層が持つ。
 *
 * UI へはステップ一覧（AUTO_SHIFT_STEPS）をそのまま見せ、選ばれたステップを runAutoShiftStep で
 * 実行する。新しいコマンドが増えても UI は変更不要（リスト駆動）。
 */
import {
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  ScheduleAvailability,
  WorkShift,
  Staff,
  AUTO_SHIFT_STEPS,
  type AutoShiftStep,
  type AutoShiftContext,
  type AutoShiftStepResult,
  type DecodedWish,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { DAY_OFF_WISH, isWorkWish, workWishName } from "../ui/shiftWishOptions.js";

export { AUTO_SHIFT_STEPS };
export type { AutoShiftStep, AutoShiftStepResult };

/**
 * その日のその人の希望を、自動シフトが扱える形にデコードする。
 *   - 休みたい(want) だけ            → day-off
 *   - 特定の勤務帯を1つだけ希望(want) → work（その帯）
 *   - 希望なし                        → neutral
 *   - それ以外（複数希望・休み×勤務帯の同時希望・避けたい等）→ ambiguous
 */
const decodeWish = (
  wish: StaffMonthlyShiftWish | undefined,
  day: WorkingDay,
  shiftIdByName: Map<string, string>
): DecodedWish => {
  if (!wish) return { kind: "neutral" };
  const wishes = wish.wishesOn(day);
  const keys = Object.keys(wishes);
  if (keys.length === 0) return { kind: "neutral" };

  const wantDayOff = wishes[DAY_OFF_WISH] === "want";
  const wantShiftNames = keys
    .filter((k) => isWorkWish(k) && wishes[k] === "want")
    .map(workWishName);

  if (wantDayOff && wantShiftNames.length === 0) return { kind: "day-off" };
  if (!wantDayOff && wantShiftNames.length === 1) {
    const shiftId = shiftIdByName.get(wantShiftNames[0]);
    return shiftId ? { kind: "work", shiftId } : { kind: "ambiguous" };
  }
  return { kind: "ambiguous" };
};

export type AutoShiftParams = {
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  workShifts: WorkShift[];
  /** staffId → その月のシフト希望 */
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  /** 可能勤務帯（無ければ全可） */
  availability?: ScheduleAvailability;
  /** 連勤上限（既定 5） */
  maxConsecutive?: number;
};

/** params から各ステップ共通の文脈を組む（希望のデコード・可能勤務帯の述語化） */
const buildContext = (params: AutoShiftParams): AutoShiftContext => {
  const { staffList, workShifts, wishByStaff, availability, maxConsecutive } = params;

  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  // 勤務帯名 → 実体ID。同名が複数あれば最初の1つ（需要は名前粒度なので代表IDで埋める）
  const shiftIdByName = new Map<string, string>();
  for (const w of workShifts) {
    if (!shiftIdByName.has(w.name)) shiftIdByName.set(w.name, w.id);
  }

  return {
    staffIds: staffList.map((s) => s.id),
    shiftIdByName,
    shiftNameById,
    preferenceOf: (staffId, day) => decodeWish(wishByStaff.get(staffId), day, shiftIdByName),
    isAvailable: availability
      ? (staffId, shiftId) => availability.isAllowed(staffId, shiftId)
      : undefined,
    maxConsecutive,
  };
};

/** 指定の自動シフトステップを1つ実行し、新しい勤務表と結果を返す */
export const runAutoShiftStep = (
  step: AutoShiftStep,
  params: AutoShiftParams
): AutoShiftStepResult => step.run(params.schedule, buildContext(params));
