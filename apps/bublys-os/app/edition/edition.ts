/**
 * **この OS の版** ── 見せたい見本が変わったら、ここを書き換える。
 *
 * ★ 規則は 1 つ：**憶えている版が今の版と違う端末には、起動時に 1 回だけ訊く。**
 *   「この版の見本で始めるか、今のまま続けるか」。どちらを選んでも今の版を
 *   憶えるので、同じ版のあいだは二度と訊かない。
 * ★ 初めて来た人（何も憶えていない端末）には訊かない ── 何もしなくても見本から始まるから。
 * ★ 版の名前は比べない（新しい・古いの順は無い）。**違うかどうか**だけを見る。
 *   日付を入れておくと、いつの版かが読める。
 */
export const CURRENT_EDITION = "2026-10-travel";

/** 版を憶えておく所（localStorage の鍵）。OS ぜんぶの片付けで一緒に消える */
export const EDITION_STORAGE_KEY = "bublys.edition";

/**
 * 起動時にどうするか。
 * - `fresh` … 何も憶えていない。訊かずに今の版を憶える
 * - `current` … 今の版を見たことがある。何もしない
 * - `ask` … 前の版で使っていた。見本で始めるか訊く
 */
export type EditionDecision = "fresh" | "current" | "ask";

/**
 * @param seenEdition 憶えている版（無ければ null）
 * @param hasSavedData 版のほかに、この端末が何か憶えているか
 * @param currentEdition 今の版
 */
export function decideEdition(
  seenEdition: string | null,
  hasSavedData: boolean,
  currentEdition: string = CURRENT_EDITION,
): EditionDecision {
  if (seenEdition === currentEdition) return "current";
  return hasSavedData ? "ask" : "fresh";
}
