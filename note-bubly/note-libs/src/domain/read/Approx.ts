/**
 * **曖昧な数** ── 人が書いた数は、たいてい一点ではない。
 *
 * > 「2〜3時間」「1.5万くらい」「¥1,500〜2,000」
 *
 * ★ **一点に丸めない。** 丸めた瞬間に、書いた人が言っていないことを言ったことになる。
 *   「2〜3時間」を 150 分にすると、画面には 150 分と出るが、本人はそう書いていない。
 * ★ **書かれたままを持ち歩く**（`raw`）。画面に出すのはこちら。数として要るとき
 *   （合計を出す、時刻を決める）だけ {@link representative} を使う。
 * ★ 幅があること自体が意味を持つ ── 「まだ決まっていない」の合図なので、
 *   幅を捨てると「決まっている／いない」の見分けまで消える。
 */

export type Approx = {
  /** いちばん小さい見積り */
  readonly min: number;
  /** いちばん大きい見積り。一点なら `min` と同じ */
  readonly max: number;
  /** 「くらい」「約」「ほど」が付いていたか */
  readonly about: boolean;
  /** 書かれたまま。画面にはこれを出す */
  readonly raw: string;
};

/** 一点の数 */
export const exact = (value: number, raw: string): Approx => ({
  min: value,
  max: value,
  about: false,
  raw,
});

/** 幅のある数 */
export const between = (min: number, max: number, raw: string): Approx => ({
  min: Math.min(min, max),
  max: Math.max(min, max),
  about: false,
  raw,
});

/** 「くらい」が付いた数 */
export const about = (value: number, raw: string): Approx => ({
  min: value,
  max: value,
  about: true,
  raw,
});

/** 幅があるか（＝まだ決まっていないか） */
export const isRange = (a: Approx): boolean => a.min !== a.max;

/** 決まっていないか（幅があるか、「くらい」が付いているか） */
export const isVague = (a: Approx): boolean => isRange(a) || a.about;

/**
 * **数として 1 つ要るときの値。**
 *
 * ★ 幅があるときは**小さいほう**を採る。真ん中ではない ── 予算も時間も、
 *   少なめに見ておいて足りなければ増やすほうが、多めに見て余らせるより痛くない。
 *   それに、真ん中は**書かれていない数**なので、どこから来たのか説明できない。
 */
export const representative = (a: Approx): number => a.min;

/** 足し合わせる。幅は幅のまま足す */
export const plus = (a: Approx, b: Approx): Approx => ({
  min: a.min + b.min,
  max: a.max + b.max,
  about: a.about || b.about,
  raw: `${a.raw} + ${b.raw}`,
});
