/**
 * **装い** ── 枠が、中身の**外に**取るぶん。
 *
 * > **泡が持つ大きさは、中身の大きさ。装いのぶんは枠が外へ足す。**
 *
 * ★ **中身は、置かれた場所で大きさを変えない。** 変わるのは装いだけ。
 *   前は泡の `size` が「装い込みの箱」だったので、同じ札が
 *   海（装い 34）と一覧（装い 2）で**中身の高さが 86 と 118 に変わって**いた。
 *   だから札の高さを海に合わせると一覧で 34 余り、一覧に合わせると海で見切れる
 *   ── どちらを選んでも破綻する形だった。
 *
 * ★ この表が出来る前は、同じ差を**その場しのぎで埋めて**いた:
 *   - `SELECTED_GROW = (27+7)−(1+1)` … 選んだ札だけ背を伸ばす
 *   - `toDockSize` / `toBubbleSize` … 岸へ貼るとき 24 引き、返すとき 24 足す
 *   - 「札の高さ＝中身＋34」という各バブリの慣習
 *   - 模型のヘッダ 24 と CSS の 27 の 3px ずれを、一覧の口の隙間に込める
 *   4 つとも同じ一点から出ていた。数はここ 1 か所に置き、模型も CSS もここを読む。
 */
import { METRICS } from './types.js';
import type { Size } from './types.js';

/** 装いの取り分（px）。上下左右それぞれ */
export interface Chrome {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * 装いの種類。**泡の状態**であって、泡が持つ値ではない
 * （どれを着ているかは、その場で描く側が決める）。
 */
export type ChromeId = 'bare' | 'bar' | 'plain' | 'quiet' | 'packed';

/**
 * 状態ごとの装い。
 *
 * - `bare` … 装いを持たない。③ 見えない親と、岸に着いた泡（管と中身だけ）
 * - `bar` … **帯だけ**。題名の帯 24 のぶん下がるが、余白は取らない
 *   ── 窓（中身が自分の宇宙を持つ泡）と、**ラボの泡**がこれ。**既定**
 * - `plain` … 普通の泡。帯 24 ＋ 中身との隙間 3 ＝ 27、左右と下は 7
 * - `quiet` … 一覧の札（装いを出していない）。**上下も左右と同じ**
 * - `packed` … 一覧の札で、詰める並びのとき。**装いは無い**（箱＝中身）。
 *   ★ **隙間は並べ方が決める**（View の軸の `gap`）。装いは隙間ではない。
 *     1px でも持たせると、札どうしのあいだがその 2 倍ぶんだけ勝手に開き、
 *     一覧の幅も「中身＋装い＋余白」で数えることになる ── 中身だけを見て決められなくなる
 *
 * ★ 既定が `bar` なのは、**模型の素の振る舞いをラボと同じに保つ**ため。
 *   左右や下の余白は「バブリの画面を載せる器」の都合（`space-css` の `.bl-body`）で、
 *   模型そのものの性質ではない ── 着せるのは描く側。
 */
export const CHROME: Readonly<Record<ChromeId, Chrome>> = {
  bare: { left: 0, top: 0, right: 0, bottom: 0 },
  bar: { left: 0, top: METRICS.HEADER, right: 0, bottom: 0 },
  plain: { left: 7, top: 27, right: 7, bottom: 7 },
  quiet: { left: 7, top: 7, right: 7, bottom: 7 },
  packed: { left: 0, top: 0, right: 0, bottom: 0 },
};

/** 装いが横に取るぶん */
export const chromeW = (c: Chrome): number => c.left + c.right;
/** 装いが縦に取るぶん */
export const chromeH = (c: Chrome): number => c.top + c.bottom;

/** 中身の大きさ → 箱の大きさ */
export const addChrome = (content: Size, c: Chrome): Size => ({
  w: content.w + chromeW(c),
  h: content.h + chromeH(c),
});

/** 箱の大きさ → 中身の大きさ（読み替えに使う。0 は下回らない） */
export const stripChrome = (box: Size, c: Chrome): Size => ({
  w: Math.max(0, box.w - chromeW(c)),
  h: Math.max(0, box.h - chromeH(c)),
});

/** CSS の inset（`.bl-body` の置き方）。CSS 側はこれを書き出すだけ */
export const chromeInset = (c: Chrome): string =>
  `left:${c.left}px;top:${c.top}px;right:${c.right}px;bottom:${c.bottom}px`;
