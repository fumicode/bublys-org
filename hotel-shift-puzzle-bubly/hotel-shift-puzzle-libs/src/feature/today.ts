import { WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";

/**
 * 今日（端末の現地時刻での日付）。時計を読むのは feature 層の仕事なので、ドメインには
 * この値を渡す（ドメインは時計を読まない）。
 */
export const todayWorkingDay = (now: Date = new Date()): WorkingDay =>
  WorkingDay.of(now.getFullYear(), now.getMonth() + 1, now.getDate());
