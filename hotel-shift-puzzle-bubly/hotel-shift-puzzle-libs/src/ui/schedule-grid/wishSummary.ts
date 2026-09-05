import type { WorkingDay, StaffMonthlyShiftWish, WorkShift } from "../../domain/index.js";
import {
  DAY_OFF_WISH,
  isWorkWish,
  workWishName,
  wishOptionLabel,
} from "../shiftWishOptions.js";
import { SHIFT_FG } from "./constants.js";

/**
 * そのセル（スタッフ×日）のシフト希望1件。
 *
 * グリッドでは「実際に入力した勤務帯」と同じ粒度で読めるよう、希望も1文字（休 / 7 …）で出す。
 * その1文字を、文字色と同じ色の円で囲んで「これは希望であって確定ではない」ことを示す。
 */
export type WishEntry = {
  /** 希望のオプションキー（"day-off" / "work:早番"） */
  key: string;
  /** 表示ラベル（休み / 早番 …）。tooltip や希望行に使う */
  label: string;
  /** 1文字表示（休み→「休」／勤務帯→開始時刻の「時」。勤務帯が解決できなければ頭1文字） */
  char: string;
  /** ○=就きたい / ×=避けたい */
  pref: "want" | "avoid";
  /** 勤務帯の希望のときその勤務帯ID（実際の割当と一致するかの判定・色に使う） */
  shiftId?: string;
  /** 文字色＝円の線色（勤務帯色。休みはグレー） */
  color: string;
};

/** 休み希望の色（勤務帯色に無いのでここで決める） */
const DAY_OFF_WISH_COLOR = "#78909c";
const FALLBACK_COLOR = "#607d8b";

/**
 * そのセルのシフト希望を WishEntry[] に要約する。
 *
 * shiftOf（勤務帯名 → 勤務帯）を渡すと、勤務帯の希望を「開始時刻の時」1文字で出せる
 * （＝実際に入力した勤務帯セルと同じ見た目の粒度になる）。省略時は名前の頭1文字。
 */
export function wishEntriesFor(
  wishByStaff: Map<string, StaffMonthlyShiftWish> | undefined,
  staffId: string,
  day: WorkingDay,
  shiftOf?: (shiftName: string) => WorkShift | undefined
): WishEntry[] {
  const wishes = wishByStaff?.get(staffId)?.wishesOn(day);
  if (!wishes) return [];

  return Object.entries(wishes).map(([key, pref]) => {
    if (key === DAY_OFF_WISH) {
      return {
        key,
        label: wishOptionLabel(key),
        char: "休",
        pref,
        color: DAY_OFF_WISH_COLOR,
      };
    }
    const name = isWorkWish(key) ? workWishName(key) : key;
    const shift = shiftOf?.(name);
    return {
      key,
      label: wishOptionLabel(key),
      char: shift ? String(shift.startHour) : name.slice(0, 1),
      pref,
      shiftId: shift?.id,
      color: (shift && SHIFT_FG[shift.id]) || FALLBACK_COLOR,
    };
  });
}

/** 希望を短いテキストに（○=ラベル / ×=×ラベル）。tooltip・希望行の表示に使う */
export const wishText = (e: WishEntry) => (e.pref === "want" ? e.label : `×${e.label}`);
