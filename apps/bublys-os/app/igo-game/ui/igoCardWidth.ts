/**
 * 対局の札の幅 ── **名前が何文字入るか**で決まる。
 *
 * > **理想は 12 文字。箱が足りなければ 7 文字まで譲る。**
 * > **12 文字を超えるのは、12 文字より長い名前があり、かつ箱に余地があるときだけ。**
 *
 * 札の中身のうち、幅を決めているのは名前の行だけ（`9路 対局` は 47、`2手・対局中・黒番` は 103、
 * 名前は 12 文字で 156 ── 実測）。だから札の幅は「名前に何文字ぶん割くか」の 1 つで決まる。
 *
 * ★ 文字数は**全角 1 文字**で数える。半角しか入っていない名前はもっと入るが、
 *   幅を決めるのに実際の字を測ると、**名前を書き換えるたびに札の幅が動く**。
 * ★ 縮むのは**箱が足りないときだけ**。名前が短いからといって細くはしない
 *   ── 並んだ札の幅が名前の長さでばらつくと、一覧が読みにくい。
 */

/** 名前 1 文字ぶんの幅（13px の全角） */
export const NAME_CHAR = 13;

/**
 * 名前以外のぶん（実測）:
 * 余白 10 ＋ 盤 64 ＋ すき間 10 ＋ アイコン 18 ＋ すき間 10 ＋ ×の口 30 ＋ 余白 10 ＝ 152
 */
export const CARD_FIXED = 152;

/** 理想の文字数。ここを目指す */
export const IDEAL_CHARS = 12;
/** 下限の文字数。箱が足りなくても、ここまでしか譲らない（あとは見切れる） */
export const MIN_CHARS = 7;

/** その幅に、名前が何文字ぶん入るか */
const charsIn = (width: number): number => Math.floor((width - CARD_FIXED) / NAME_CHAR);

/** その文字数のときの札の幅 */
export const widthOfChars = (chars: number): number => CARD_FIXED + chars * NAME_CHAR;

/**
 * 札の幅を決める。
 *
 * @param longest 一覧の中で**いちばん長い名前**の文字数
 * @param room 並びに使える幅（一覧の中身から、並びの余白を引いたぶん）
 */
export const igoCardWidth = (longest: number, room: number): number => {
  const fits = charsIn(room);
  // 12 文字を超える名前があるときだけ、余地のぶんだけ広げてよい
  const wanted = longest > IDEAL_CHARS ? Math.max(IDEAL_CHARS, Math.min(longest, fits)) : IDEAL_CHARS;
  // 箱が足りなければ譲る。ただし下限まで
  return widthOfChars(Math.max(MIN_CHARS, Math.min(wanted, fits)));
};
