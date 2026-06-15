import { StaffMonthlyShiftWish, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import { DAY_OFF_WISH, workWishKey } from "../ui/shiftWishOptions.js";

/**
 * サンプルのスタッフ月別シフト希望（2026年6月）。
 * 休みたい・特定帯がいい・避けたい・どうでもいい を散りばめる。
 */
export function createSampleShiftWishes(): StaffMonthlyShiftWish[] {
  const d = (day: number) => WorkingDay.of(2026, 6, day);

  // 佐藤 花子: 3日休みたい / 5日は早番がいい
  const sato = StaffMonthlyShiftWish.create({ staffId: "staff-1", year: 2026, month: 6 })
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(5), workWishKey("早番"), "want");

  // 鈴木 一郎: 2日は遅番がいい / 4日は休みを避けたい（出勤したい）
  const suzuki = StaffMonthlyShiftWish.create({ staffId: "staff-2", year: 2026, month: 6 })
    .setPreference(d(2), workWishKey("遅番"), "want")
    .setPreference(d(4), DAY_OFF_WISH, "avoid");

  // 伊藤 さくら: 6日休みたい / 1日は早番は避けたい
  const ito = StaffMonthlyShiftWish.create({ staffId: "staff-5", year: 2026, month: 6 })
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(1), workWishKey("早番"), "avoid");

  return [sato, suzuki, ito];
}
