import type { WorkingDay, StaffMonthlyShiftWish } from "../../domain/index.js";
import { wishOptionLabel } from "../shiftWishOptions.js";

export type WishEntry = { label: string; pref: "want" | "avoid" };

/**
 * そのセル（スタッフ×日）のシフト希望を {ラベル, 希望(○/×)} の配列に要約する。
 * 未割当セルの薄い表示と、スタッフ展開時の希望行で共有する。
 */
export function wishEntriesFor(
  wishByStaff: Map<string, StaffMonthlyShiftWish> | undefined,
  staffId: string,
  day: WorkingDay
): WishEntry[] {
  const wishes = wishByStaff?.get(staffId)?.wishesOn(day);
  if (!wishes) return [];
  return Object.entries(wishes).map(([k, p]) => ({ label: wishOptionLabel(k), pref: p }));
}

/** 希望を短いテキストに（○=ラベル / ×=×ラベル） */
export const wishText = (e: WishEntry) => (e.pref === "want" ? e.label : `×${e.label}`);
