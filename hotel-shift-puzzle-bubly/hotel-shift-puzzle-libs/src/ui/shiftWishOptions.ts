/**
 * シフト希望のオプションキー定義（編集UI・グリッド表示で共有）。
 *
 * StaffMonthlyShiftWish は「日→オプションキー→希望」の統一形でモデル化されていて、
 * オプションキーの意味（休み／各勤務帯）はこの上位層が決める。ここでキーと表示ラベルを
 * 一元管理する。
 *   - 休み          : "day-off"
 *   - 勤務帯(名前)  : "work:<勤務帯名>"
 */

export const DAY_OFF_WISH = "day-off";

export const workWishKey = (shiftName: string): string => `work:${shiftName}`;
export const isWorkWish = (key: string): boolean => key.startsWith("work:");
export const workWishName = (key: string): string => key.slice("work:".length);

/** オプションキー → 表示ラベル */
export const wishOptionLabel = (key: string): string =>
  key === DAY_OFF_WISH ? "休み" : workWishName(key);

/**
 * 編集UI・凡例の列順。休み + 勤務帯名（重複名は1つにまとめる＝名前が同じなら同一勤務帯）。
 */
export function buildWishOptions(
  shiftNames: string[]
): { key: string; label: string }[] {
  const options = [{ key: DAY_OFF_WISH, label: "休み" }];
  const seen = new Set<string>();
  for (const name of shiftNames) {
    if (!seen.has(name)) {
      seen.add(name);
      options.push({ key: workWishKey(name), label: name });
    }
  }
  return options;
}
