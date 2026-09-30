/**
 * **かなを漢字に変えている最中か。**
 *
 * > 変換中の Enter は「この字でよい」であって、「書き終えた」ではない。
 *
 * ★ 日本語（や中国語・韓国語）を打つとき、変換を決めるのに Enter を押す。
 *   その打鍵も `keydown` として届くので、**Enter で確定する欄は、変換を決めただけで
 *   閉じてしまう** ── 「はこね」と打って変換した瞬間に欄から追い出される
 *   （実測：CSV インポーターのセル）。
 * ★ 直し方は 1 つ ── **変換の最中なら、その打鍵は無かったことにする。**
 *   ブラウザは `isComposing` でそれを教えてくれる。
 * ★ ここに置いたのは、**同じ間違いがどの欄でも起きる**から。欄ごとに書くと、
 *   必ず書き忘れた欄が残る（実測：セルは直っても見出しは直っていなかった）。
 */

/** 変換の最中の打鍵か。React の合成イベントでも、素のイベントでも読める */
export const isComposing = (
  e: { nativeEvent?: { isComposing?: boolean; keyCode?: number }; isComposing?: boolean; keyCode?: number },
): boolean => {
  const native = e.nativeEvent ?? e;
  if (native.isComposing) return true;
  /**
   * ★ **229 も見る。** 変換中の打鍵を `keyCode: 229` としてだけ知らせるブラウザがある
   *   （`isComposing` を立てない）。両方見ておけば取りこぼさない。
   */
  return native.keyCode === 229;
};

/**
 * **書き終えた合図としての Enter か。**
 *
 * 変換の最中なら false ── 欄を閉じる・次へ移る、といった「終わり」の動きは、
 * これが true のときだけにする。
 */
export const isCommitKey = (
  e: { key: string; nativeEvent?: { isComposing?: boolean; keyCode?: number }; isComposing?: boolean; keyCode?: number },
): boolean => e.key === "Enter" && !isComposing(e);
