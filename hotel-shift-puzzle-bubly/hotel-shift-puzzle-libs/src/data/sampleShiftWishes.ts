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
 * 入力仕様（#74）に合わせ、1日に出せるのは「休」か「勤務帯×の集合」のどちらか一方:
 * - 休みたい            : DAY_OFF_WISH を "want"（＝入力表の「休」）
 * - この帯には入れない  : workWishKey(名前) を "avoid"（＝入力表の「×」）
 *
 * そのため「この帯がいい」は **他の帯すべてに×** として書く。
 * 例: 「3日は早番がいい」→ 3日の 中番×・遅番×（残るのは早番だけ）。
 * コメントは人が読む意図（早番がいい／遅番に積極的）のまま残している。
 */
export function createSampleShiftWishes(): StaffMonthlyShiftWish[] {
  return [...juneWishes(), ...julyWishes(), ...augustWishes(), ...septemberWishes()];
}

/**
 * 2026年8月（土日: 1,2,8,9,15,16,22,23,29,30）。作成途中シナリオの元になる希望。
 *
 * この月は「まず全員の希望を集め、それに沿って組み、残りを制約から詰めていく」流れを
 * 見るための月なので、6月・7月より丁寧に希望が入っている（休みに加えて時間帯の希望も）。
 * 勤務表（sampleScenarios.ts）はこの希望に沿って組んであり、月末に近い数日だけが未定で
 * 残る。その残りが制約から順に決まっていく。
 *
 * 特に 21日（金）は、山本と土屋が揃って休みを希望している日。責任者が2人抜けるので、
 * 残った人の入れる勤務帯が一意に決まる（＝確定提案が立つ）。
 */
function augustWishes(): StaffMonthlyShiftWish[] {
  const d = (day: number) => WorkingDay.of(2026, 8, day);
  const wish = (staffId: string) =>
    StaffMonthlyShiftWish.create({ staffId, year: 2026, month: 8 });

  // 佐藤 花子: 休み 5(水)12(水)26(水) / 早番がいい 3(月)
  const sato = wish("staff-1")
    .setPreference(d(5), DAY_OFF_WISH, "want")
    .setPreference(d(12), DAY_OFF_WISH, "want")
    .setPreference(d(26), DAY_OFF_WISH, "want")
    .setPreference(d(3), workWishKey("中番"), "avoid")
    .setPreference(d(3), workWishKey("遅番"), "avoid");

  // 鈴木 一郎: 休み 4(火)11(火)25(火) / 遅番に積極的 7(金)29(土)
  const suzuki = wish("staff-2")
    .setPreference(d(4), DAY_OFF_WISH, "want")
    .setPreference(d(11), DAY_OFF_WISH, "want")
    .setPreference(d(25), DAY_OFF_WISH, "want")
    .setPreference(d(7), workWishKey("早番"), "avoid")
    .setPreference(d(7), workWishKey("中番"), "avoid")
    .setPreference(d(29), workWishKey("早番"), "avoid")
    .setPreference(d(29), workWishKey("中番"), "avoid");

  // 高橋 美里（早責）: 休み 6(木)13(木)27(木) / 中番がいい 22(土)
  const takahashi = wish("staff-3")
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(13), DAY_OFF_WISH, "want")
    .setPreference(d(27), DAY_OFF_WISH, "want")
    .setPreference(d(22), workWishKey("早番"), "avoid")
    .setPreference(d(22), workWishKey("遅番"), "avoid");

  // 田中 健太（予責）: 休み 3(月)10(月)24(月) / 早番がいい 21(金)
  const tanaka = wish("staff-4")
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(24), DAY_OFF_WISH, "want")
    .setPreference(d(21), workWishKey("中番"), "avoid")
    .setPreference(d(21), workWishKey("遅番"), "avoid");

  // 伊藤 さくら: 休み 8(土)18(火)28(金) / 早番は避けたい 19(水)
  const ito = wish("staff-5")
    .setPreference(d(8), DAY_OFF_WISH, "want")
    .setPreference(d(18), DAY_OFF_WISH, "want")
    .setPreference(d(28), DAY_OFF_WISH, "want")
    .setPreference(d(19), workWishKey("早番"), "avoid");

  // 土屋 健司（夜責）: 休み 14(金)21(金)31(月) / 遅番がいい 16(日)
  const tsuchiya = wish("staff-tsuchiya")
    .setPreference(d(14), DAY_OFF_WISH, "want")
    .setPreference(d(21), DAY_OFF_WISH, "want")
    .setPreference(d(31), DAY_OFF_WISH, "want")
    .setPreference(d(16), workWishKey("早番"), "avoid")
    .setPreference(d(16), workWishKey("中番"), "avoid");

  // 中村 大輔（夜責）: 休み 9(日)23(日)30(日) / 21(金)は早番を避けたい（朝が続いたので）
  const nakamura = wish("staff-6")
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(23), DAY_OFF_WISH, "want")
    .setPreference(d(30), DAY_OFF_WISH, "want")
    .setPreference(d(21), workWishKey("早番"), "avoid");

  // 山本 由美（早責・予責）: 休み 7(金)21(金)28(金) / 中番がいい 22(土)
  const yamamoto = wish("staff-7")
    .setPreference(d(7), DAY_OFF_WISH, "want")
    .setPreference(d(21), DAY_OFF_WISH, "want")
    .setPreference(d(28), DAY_OFF_WISH, "want")
    .setPreference(d(22), workWishKey("早番"), "avoid")
    .setPreference(d(22), workWishKey("遅番"), "avoid");

  // 小林 恵（早責）: 休み 2(日)15(土)29(土) / 早番がいい 5(水)
  const kobayashi = wish("staff-8")
    .setPreference(d(2), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(29), DAY_OFF_WISH, "want")
    .setPreference(d(5), workWishKey("中番"), "avoid")
    .setPreference(d(5), workWishKey("遅番"), "avoid");

  return [sato, suzuki, takahashi, tanaka, ito, tsuchiya, nakamura, yamamoto, kobayashi];
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
    .setPreference(d(5), workWishKey("中番"), "avoid")
    .setPreference(d(5), workWishKey("遅番"), "avoid")
    .setPreference(d(22), workWishKey("中番"), "avoid")
    .setPreference(d(22), workWishKey("遅番"), "avoid");

  // 鈴木 一郎: 休み 9(火)16(火)23(火)27(土) / 遅番に積極的 2(火)11(木)
  const suzuki = StaffMonthlyShiftWish.create({ staffId: "staff-2", year: 2026, month: 6 })
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(16), DAY_OFF_WISH, "want")
    .setPreference(d(23), DAY_OFF_WISH, "want")
    .setPreference(d(27), DAY_OFF_WISH, "want")
    .setPreference(d(2), workWishKey("早番"), "avoid")
    .setPreference(d(2), workWishKey("中番"), "avoid")
    .setPreference(d(11), workWishKey("早番"), "avoid")
    .setPreference(d(11), workWishKey("中番"), "avoid");

  // 高橋 美里: 休み 4(木)15(月)18(木)25(木) / 中番がいい 20(土) / 早番がいい 26(金)
  const takahashi = StaffMonthlyShiftWish.create({ staffId: "staff-3", year: 2026, month: 6 })
    .setPreference(d(4), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(18), DAY_OFF_WISH, "want")
    .setPreference(d(25), DAY_OFF_WISH, "want")
    .setPreference(d(20), workWishKey("早番"), "avoid")
    .setPreference(d(20), workWishKey("遅番"), "avoid")
    .setPreference(d(26), workWishKey("中番"), "avoid")
    .setPreference(d(26), workWishKey("遅番"), "avoid");

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

  // 土屋 健司（夜責）: 休み 2(火)10(水)18(木)26(金) / 遅番に積極的 5(金)20(土)
  const tsuchiya = StaffMonthlyShiftWish.create({ staffId: "staff-tsuchiya", year: 2026, month: 6 })
    .setPreference(d(2), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(18), DAY_OFF_WISH, "want")
    .setPreference(d(26), DAY_OFF_WISH, "want")
    .setPreference(d(5), workWishKey("早番"), "avoid")
    .setPreference(d(5), workWishKey("中番"), "avoid")
    .setPreference(d(20), workWishKey("早番"), "avoid")
    .setPreference(d(20), workWishKey("中番"), "avoid");

  // 中村 大輔（夜責）: 休み 4(木)11(木)19(金)25(木) / 遅番がいい 12(金)
  const nakamura = StaffMonthlyShiftWish.create({ staffId: "staff-6", year: 2026, month: 6 })
    .setPreference(d(4), DAY_OFF_WISH, "want")
    .setPreference(d(11), DAY_OFF_WISH, "want")
    .setPreference(d(19), DAY_OFF_WISH, "want")
    .setPreference(d(25), DAY_OFF_WISH, "want")
    .setPreference(d(12), workWishKey("早番"), "avoid")
    .setPreference(d(12), workWishKey("中番"), "avoid");

  // 山本 由美（早責）: 休み 1(月)9(火)14(日)16(火)23(火) / 早番がいい 6(土)
  const yamamoto = StaffMonthlyShiftWish.create({ staffId: "staff-7", year: 2026, month: 6 })
    .setPreference(d(1), DAY_OFF_WISH, "want")
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(14), DAY_OFF_WISH, "want")
    .setPreference(d(16), DAY_OFF_WISH, "want")
    .setPreference(d(23), DAY_OFF_WISH, "want")
    .setPreference(d(6), workWishKey("中番"), "avoid")
    .setPreference(d(6), workWishKey("遅番"), "avoid");

  // 小林 恵（早責）: 休み 3(水)15(月)17(水)24(水) / 早番がいい 13(土)
  const kobayashi = StaffMonthlyShiftWish.create({ staffId: "staff-8", year: 2026, month: 6 })
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want")
    .setPreference(d(24), DAY_OFF_WISH, "want")
    .setPreference(d(13), workWishKey("中番"), "avoid")
    .setPreference(d(13), workWishKey("遅番"), "avoid");

  return [sato, suzuki, takahashi, tanaka, ito, tsuchiya, nakamura, yamamoto, kobayashi];
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
    .setPreference(d(20), workWishKey("中番"), "avoid")
    .setPreference(d(20), workWishKey("遅番"), "avoid");

  // 鈴木 一郎: 休み 7(火)14(火)21(火)28(火) / 遅番に積極的 19(日)
  const suzuki = StaffMonthlyShiftWish.create({ staffId: "staff-2", year: 2026, month: 7 })
    .setPreference(d(7), DAY_OFF_WISH, "want")
    .setPreference(d(14), DAY_OFF_WISH, "want")
    .setPreference(d(21), DAY_OFF_WISH, "want")
    .setPreference(d(28), DAY_OFF_WISH, "want")
    .setPreference(d(19), workWishKey("早番"), "avoid")
    .setPreference(d(19), workWishKey("中番"), "avoid");

  // 高橋 美里: 休み 3(金)10(金)17(金)24(金) / 早番がいい 31(金)
  const takahashi = StaffMonthlyShiftWish.create({ staffId: "staff-3", year: 2026, month: 7 })
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want")
    .setPreference(d(24), DAY_OFF_WISH, "want")
    .setPreference(d(31), workWishKey("中番"), "avoid")
    .setPreference(d(31), workWishKey("遅番"), "avoid");

  // 田中 健太: 休み 1(水)6(月)15(水)18(土)
  const tanaka = StaffMonthlyShiftWish.create({ staffId: "staff-4", year: 2026, month: 7 })
    .setPreference(d(1), DAY_OFF_WISH, "want")
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(18), DAY_OFF_WISH, "want");

  // 伊藤 さくら: 休み 6(月)13(月)27(月) / 11(土)はどうしても休みたい
  const ito = StaffMonthlyShiftWish.create({ staffId: "staff-5", year: 2026, month: 7 })
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(13), DAY_OFF_WISH, "want")
    .setPreference(d(27), DAY_OFF_WISH, "want")
    .setPreference(d(11), DAY_OFF_WISH, "want");

  // 土屋 健司（夜責）: 休み 2(木)10(金)17(金)24(金) / 遅番がいい 18(土)
  const tsuchiya = StaffMonthlyShiftWish.create({ staffId: "staff-tsuchiya", year: 2026, month: 7 })
    .setPreference(d(2), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want")
    .setPreference(d(24), DAY_OFF_WISH, "want")
    .setPreference(d(18), workWishKey("早番"), "avoid")
    .setPreference(d(18), workWishKey("中番"), "avoid");

  // 中村 大輔（夜責）: 休み 1(水)8(水)15(水)22(水) / 遅番がいい 4(土)
  const nakamura = StaffMonthlyShiftWish.create({ staffId: "staff-6", year: 2026, month: 7 })
    .setPreference(d(1), DAY_OFF_WISH, "want")
    .setPreference(d(8), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(22), DAY_OFF_WISH, "want")
    .setPreference(d(4), workWishKey("早番"), "avoid")
    .setPreference(d(4), workWishKey("中番"), "avoid");

  // 山本 由美（早責）: 休み 3(金)9(水)15(水)16(水)23(水) / 早番がいい 5(日)
  const yamamoto = StaffMonthlyShiftWish.create({ staffId: "staff-7", year: 2026, month: 7 })
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want")
    .setPreference(d(16), DAY_OFF_WISH, "want")
    .setPreference(d(23), DAY_OFF_WISH, "want")
    .setPreference(d(5), workWishKey("中番"), "avoid")
    .setPreference(d(5), workWishKey("遅番"), "avoid");

  // 小林 恵（早責）: 休み 6(月)13(月)20(月)27(月) / 早番がいい 12(日)
  const kobayashi = StaffMonthlyShiftWish.create({ staffId: "staff-8", year: 2026, month: 7 })
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(13), DAY_OFF_WISH, "want")
    .setPreference(d(20), DAY_OFF_WISH, "want")
    .setPreference(d(27), DAY_OFF_WISH, "want")
    .setPreference(d(12), workWishKey("中番"), "avoid")
    .setPreference(d(12), workWishKey("遅番"), "avoid");

  return [sato, suzuki, takahashi, tanaka, ito, tsuchiya, nakamura, yamamoto, kobayashi];
}

// ---------------- 2026年9月（土日: 5,6,12,13,19,20,26,27） ----------------
/**
 * 終盤シナリオ（sampleScenarios.ts の createEndgameSchedule）の月の希望。
 *
 * 8月ほど細かくは入っておらず、各自の「いつもの休み曜日」が3件ずつ入っている程度。
 * 終盤の詰みは連勤上限と休み上限だけで成立するようにしてあるので、ここの希望には依存しない
 * （希望が seed されていない環境でも同じ盤面になる）。盤面の見た目を実際らしくするためのもの。
 */
function septemberWishes(): StaffMonthlyShiftWish[] {
  const d = (day: number) => WorkingDay.of(2026, 9, day);
  const wish = (staffId: string) =>
    StaffMonthlyShiftWish.create({ staffId, year: 2026, month: 9 });

  // 佐藤 花子: 休み 2(水)9(水)22(火)
  // 22日の休みは、23日から始まる5連勤（終盤の詰みの原因）の起点でもある
  const sato = wish("staff-1")
    .setPreference(d(2), DAY_OFF_WISH, "want")
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(22), DAY_OFF_WISH, "want");

  // 鈴木 一郎: 休み 1(火)8(火)15(火)
  const suzuki = wish("staff-2")
    .setPreference(d(1), DAY_OFF_WISH, "want")
    .setPreference(d(8), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want");

  // 高橋 美里（早責）: 休み 3(木)10(木)17(木)
  const takahashi = wish("staff-3")
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want");

  // 田中 健太（予責）: 休み 4(金)11(金)18(金)
  const tanaka = wish("staff-4")
    .setPreference(d(4), DAY_OFF_WISH, "want")
    .setPreference(d(11), DAY_OFF_WISH, "want")
    .setPreference(d(18), DAY_OFF_WISH, "want");

  // 伊藤 さくら: 休み 7(月)14(月)21(月)
  const ito = wish("staff-5")
    .setPreference(d(7), DAY_OFF_WISH, "want")
    .setPreference(d(14), DAY_OFF_WISH, "want")
    .setPreference(d(21), DAY_OFF_WISH, "want");

  // 土屋 健司（夜責）: 休み 6(日)13(日)20(日)
  const tsuchiya = wish("staff-tsuchiya")
    .setPreference(d(6), DAY_OFF_WISH, "want")
    .setPreference(d(13), DAY_OFF_WISH, "want")
    .setPreference(d(20), DAY_OFF_WISH, "want");

  // 中村 大輔（夜責）: 休み 2(水)9(水)16(水)
  const nakamura = wish("staff-6")
    .setPreference(d(2), DAY_OFF_WISH, "want")
    .setPreference(d(9), DAY_OFF_WISH, "want")
    .setPreference(d(16), DAY_OFF_WISH, "want");

  // 山本 由美（早責・予責）: 休み 1(火)8(火)15(火)
  const yamamoto = wish("staff-7")
    .setPreference(d(1), DAY_OFF_WISH, "want")
    .setPreference(d(8), DAY_OFF_WISH, "want")
    .setPreference(d(15), DAY_OFF_WISH, "want");

  // 小林 恵（早責）: 休み 3(木)10(木)17(木)
  const kobayashi = wish("staff-8")
    .setPreference(d(3), DAY_OFF_WISH, "want")
    .setPreference(d(10), DAY_OFF_WISH, "want")
    .setPreference(d(17), DAY_OFF_WISH, "want");

  return [sato, suzuki, takahashi, tanaka, ito, tsuchiya, nakamura, yamamoto, kobayashi];
}
