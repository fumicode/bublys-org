import { StaffMonthlyShiftWish, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import { DAY_OFF_WISH, workWishKey } from "../ui/shiftWishOptions.js";

/**
 * サンプルのスタッフ月別シフト希望（2026年6月・7月）。
 *
 * 各自が「好き勝手に」希望を出した体のデータ。普通は全日に希望を出すのではなく、
 * 「この日はどうしても休みたい」「この日は早番がいい」など、ここぞという日だけ入力し、
 * 残りは希望なし（管理者に委ねる）。それを表現する。
 *
 * - 休み希望は人間らしく1人あたり月4件ほど。ホテル業の想定なので**平日に分散**させ、
 *   同じ日に集中しないよう人をばらけさせる（週末休みは各人ごく一部だけ）。
 * - 勤務帯の希望（早番がいい・遅番がいい）も数件混ぜる。鈴木は遅番に積極的。
 *
 * - 休みたい : DAY_OFF_WISH を "want"
 * - 出勤したい(休みを避けたい) : DAY_OFF_WISH を "avoid"
 * - 特定の勤務帯がいい : workWishKey(名前) を "want"
 * - 特定の勤務帯は避けたい : workWishKey(名前) を "avoid"
 */
export function createSampleShiftWishes(): StaffMonthlyShiftWish[] {
  return [...juneWishes(), ...julyWishes()];
}

// ---------------- 2026年6月（土日: 6,7,13,14,20,21,27,28） ----------------
function juneWishes(): StaffMonthlyShiftWish[] {
  const d = (day: number) => WorkingDay.of(2026, 6, day);

  // 佐藤 花子: 休み 3(水)12(金)17(水)24(水) / 早番がいい 5(金)22(月)
  const sato = StaffMonthlyShiftWish.create({ staffId: "staff-1", year: 2026, month: 6 })
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(12), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want")
    .setPreference(d(24), DAY_OFF_WISH, "want")
    .setPreference(d(5), workWishKey("早番"), "want")
    .setPreference(d(22), workWishKey("早番"), "want");

  // 鈴木 一郎: 休み 9(火)16(火)23(火)27(土) / 遅番に積極的 2(火)11(木)
  const suzuki = StaffMonthlyShiftWish.create({ staffId: "staff-2", year: 2026, month: 6 })
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(16), DAY_OFF_WISH, "want")
    .setPreference(d(23), DAY_OFF_WISH, "want")
    .setPreference(d(27), DAY_OFF_WISH, "want")
    .setPreference(d(2), workWishKey("遅番"), "want")
    .setPreference(d(11), workWishKey("遅番"), "want");

  // 高橋 美里: 休み 4(木)15(月)18(木)25(木) / 中番がいい 20(土) / 早番がいい 26(金)
  const takahashi = StaffMonthlyShiftWish.create({ staffId: "staff-3", year: 2026, month: 6 })
    .setPreference(d(4), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(18), DAY_OFF_WISH, "want")
    .setPreference(d(25), DAY_OFF_WISH, "want")
    .setPreference(d(20), workWishKey("中番"), "want")
    .setPreference(d(26), workWishKey("早番"), "want");

  // 田中 健太: 休み 8(月)14(日)19(金)29(月)
  const tanaka = StaffMonthlyShiftWish.create({ staffId: "staff-4", year: 2026, month: 6 })
    .setPreference(d(8), DAY_OFF_WISH, "want")
    .setPreference(d(14), DAY_OFF_WISH, "want")
    .setPreference(d(19), DAY_OFF_WISH, "want")
    .setPreference(d(29), DAY_OFF_WISH, "want");

  // 伊藤 さくら: 休み 10(水)13(土)22(月)30(火) / 1(月)は早番を避けたい
  const ito = StaffMonthlyShiftWish.create({ staffId: "staff-5", year: 2026, month: 6 })
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(13), DAY_OFF_WISH, "want")
    .setPreference(d(22), DAY_OFF_WISH, "want")
    .setPreference(d(30), DAY_OFF_WISH, "want")
    .setPreference(d(1), workWishKey("早番"), "avoid");

  return [sato, suzuki, takahashi, tanaka, ito];
}

// ---------------- 2026年7月（土日: 4,5,11,12,18,19,25,26） ----------------
function julyWishes(): StaffMonthlyShiftWish[] {
  const d = (day: number) => WorkingDay.of(2026, 7, day);

  // 佐藤 花子: 休み 2(木)9(木)16(木)23(木) / 早番がいい 20(月)
  const sato = StaffMonthlyShiftWish.create({ staffId: "staff-1", year: 2026, month: 7 })
    .setPreference(d(2), DAY_OFF_WISH, "want")
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(16), DAY_OFF_WISH, "want")
    .setPreference(d(23), DAY_OFF_WISH, "want")
    .setPreference(d(20), workWishKey("早番"), "want");

  // 鈴木 一郎: 休み 7(火)14(火)21(火)28(火) / 遅番に積極的 19(日)
  const suzuki = StaffMonthlyShiftWish.create({ staffId: "staff-2", year: 2026, month: 7 })
    .setPreference(d(7), DAY_OFF_WISH, "want")
    .setPreference(d(14), DAY_OFF_WISH, "want")
    .setPreference(d(21), DAY_OFF_WISH, "want")
    .setPreference(d(28), DAY_OFF_WISH, "want")
    .setPreference(d(19), workWishKey("遅番"), "want");

  // 高橋 美里: 休み 3(金)10(金)17(金)24(金) / 早番がいい 31(金)
  const takahashi = StaffMonthlyShiftWish.create({ staffId: "staff-3", year: 2026, month: 7 })
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want")
    .setPreference(d(24), DAY_OFF_WISH, "want")
    .setPreference(d(31), workWishKey("早番"), "want");

  // 田中 健太: 休み 1(水)8(水)15(水)22(水)
  const tanaka = StaffMonthlyShiftWish.create({ staffId: "staff-4", year: 2026, month: 7 })
    .setPreference(d(1), DAY_OFF_WISH, "want")
    .setPreference(d(8), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(22), DAY_OFF_WISH, "want");

  // 伊藤 さくら: 休み 6(月)13(月)27(月) / 11(土)はどうしても休みたい
  const ito = StaffMonthlyShiftWish.create({ staffId: "staff-5", year: 2026, month: 7 })
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(13), DAY_OFF_WISH, "want")
    .setPreference(d(27), DAY_OFF_WISH, "want")
    .setPreference(d(11), DAY_OFF_WISH, "want");

  return [sato, suzuki, takahashi, tanaka, ito];
}
