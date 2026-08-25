/**
 * シフト希望のオプションキー定義（編集UI・グリッド表示で共有）。
 *
 * StaffMonthlyShiftWish は「日→オプションキー→希望」の統一形でモデル化されていて、
 * オプションキーの意味（休み／各勤務帯）はこの上位層が決める。ここでキーと表示ラベルを
 * 一元管理する。
 *   - 休み          : "day-off"
 *   - 勤務帯(名前)  : "work:<勤務帯名>"
 */

import type {
  ShiftWishPreference,
  StaffMonthlyShiftWish,
  WorkingDay,
} from "../domain/index.js";

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

/**
 * 入力ルール（#74）: 1日の希望は「休」か「勤務帯×の集合」のどちらか一方。
 *
 *   - 休み列   : 「休」＝その日は休みたい            （モデル上は day-off を want）
 *   - 勤務帯列 : 「×」＝この帯には入れない          （モデル上は work:<名前> を avoid）
 *
 * 休みと勤務帯×は同じ日に共存しない。後から入れた方が勝ち、反対側は自動で消える
 * （＝入力を止めるのではなく、常に矛盾のない状態に落ちる）。
 * さらに「入れる勤務帯が1つも残らない日」は休みたい日と同じことなので、全帯に×が
 * 付いた時点で自動的に休みへ畳む。
 * モデル（StaffMonthlyShiftWish）は want/avoid の汎用形のままで、この「休=want /
 * 勤務帯=avoid」という約束と排他はここだけが知っている。
 */

/** そのオプションが受け付ける極性（休み＝○したい / 勤務帯＝×避けたい） */
export const wishPreferenceOf = (key: string): ShiftWishPreference =>
  key === DAY_OFF_WISH ? "want" : "avoid";

/** 入力表に出す1文字（休み→「休」／勤務帯→「×」） */
export const wishMarkOf = (key: string): string =>
  key === DAY_OFF_WISH ? "休" : "×";

/** その日は休み希望か */
export const isDayOffChosen = (
  wish: StaffMonthlyShiftWish,
  day: WorkingDay
): boolean => wish.preferenceFor(day, DAY_OFF_WISH) === "want";

/**
 * そのセルが「休み希望によって無効になっている」か（＝斜線を引くか）。
 * 無効セルもクリックは受け付ける（押せば休みが外れて×が入る＝後勝ち）。
 */
export const isBlockedByDayOff = (
  wish: StaffMonthlyShiftWish,
  day: WorkingDay,
  key: string
): boolean => key !== DAY_OFF_WISH && isDayOffChosen(wish, day);

/**
 * その日「入れる勤務帯が1つも残っていない」なら、休みたい日と同じこと。
 * ×をすべて消して休みに畳んだ新しい希望を返す（そうでなければそのまま）。
 */
const foldAllAvoidedIntoDayOff = (
  wish: StaffMonthlyShiftWish,
  day: WorkingDay,
  optionKeys: string[]
): StaffMonthlyShiftWish => {
  const workKeys = optionKeys.filter((k) => k !== DAY_OFF_WISH);
  if (workKeys.length === 0) return wish;
  if (!workKeys.every((k) => wish.preferenceFor(day, k) === "avoid")) return wish;

  const cleared = workKeys.reduce((w, k) => w.setPreference(day, k, null), wish);
  return cleared.setPreference(day, DAY_OFF_WISH, "want");
};

/**
 * 入力表のセルを1回押したときの新しい希望を返す。不変。
 *
 *   - 既にそのオプションのマークが入っていれば外す（空欄＝どうでもいい）
 *   - 入っていなければマークを入れ、同じ日の排他相手を消す
 *       休みを入れる   → その日の勤務帯×をすべて消す
 *       勤務帯×を入れる → その日の休みを消す
 *   - その結果すべての勤務帯が×になったら、休みに畳む（入れる帯が無い＝休みたい）
 *
 * optionKeys はその入力表に並ぶ全オプション（休み＋各勤務帯）。「全帯が×か」を
 * 判定するのに要る。
 */
export function toggleWishInput(
  wish: StaffMonthlyShiftWish,
  day: WorkingDay,
  key: string,
  optionKeys: string[]
): StaffMonthlyShiftWish {
  const pref = wishPreferenceOf(key);
  // 同じマークが入っているなら外すだけ（排他は動かさない）
  if (wish.preferenceFor(day, key) === pref) {
    return wish.setPreference(day, key, null);
  }

  // 入れる：先に排他相手を消してから、そのオプションを立てる
  const conflicting =
    key === DAY_OFF_WISH
      ? Object.keys(wish.wishesOn(day)).filter((k) => k !== DAY_OFF_WISH)
      : [DAY_OFF_WISH];
  const cleared = conflicting.reduce(
    (w, k) => w.setPreference(day, k, null),
    wish
  );
  return foldAllAvoidedIntoDayOff(
    cleared.setPreference(day, key, pref),
    day,
    optionKeys
  );
}
