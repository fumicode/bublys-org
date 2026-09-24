/**
 * 操作の入れ物 ── どの操作にも同じ ctx と、同じ答えの形。
 *
 * ★ ここが domain と ui の境目。
 *   **画面に見えている矩形（補間したあと・持ち上げたあと）は domain が持たない。**
 *   要る所へは引数で渡す。こうすると domain は「値 → 見え」の目標だけを知っていればよく、
 *   補間（ease/anim）も持ち上げ（並べ替え中にカーソルについてくる）も ui に置いておける。
 *
 * 元：lab.html 1434-1460 行 reshape の before / animIds、1462-1489 行 pin の bf
 */
import type { BubbleId, Rect, Size } from './types.js';
import { resolveRules } from './rules.js';
import type { LayoutRules } from './rules.js';
import type { ChromeMap } from './measure.js';
import type { BubbleWorld } from './world.js';

/**
 * 「さっき画面に見えていた矩形」。⑤ pin と keepSeen の行き先。
 * lab.html 1435 行の before と同じ中身：x,y は画面の左上、w,h は **箱の素の大きさ**（scale をかける前）、
 * scale は合成された倍率。中心は x + w·scale/2 で出せる。
 */
export interface SeenRect extends Size {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/** ui がいま見せている矩形（補間・持ち上げ込み）。くっつけるの縁はこれで測る */
export type ScreenRects = ReadonlyMap<BubbleId, Rect>;
export type SeenRects = ReadonlyMap<BubbleId, SeenRect>;

/**
 * 形を変える操作に渡すもの。
 * pin は「書いて → 解き直して → 測る」を繰り返すので、解き直すのに要る viewport と rules をここで持つ。
 */
export interface ActContext {
  /** 画面（root の空間）の大きさ */
  readonly viewport: Size;
  /** 直前のフレームで画面に見えていた矩形。⑤ の「触っていない泡は動かない」の起点 */
  readonly seen: SeenRects;
  readonly rules: LayoutRules;
  /**
   * このフレームだけ、どの泡がどの装いを着ているか（measure.ts の ChromeMap）。
   * ⑤ pin は「書いて → 解き直して → 測る」を繰り返すので、解き直しにも同じ伸びが要る
   * ── 渡さないと、伸びている泡のぶんだけ留め先がずれる。
   */
  readonly chrome?: ChromeMap;
}

/** 形を変えたあと */
export interface ReshapeResult {
  readonly world: BubbleWorld;
  /** 補間を「見えていた所」から始める泡（ui が anim に入れる）。lab.html 1455-1459 行 startFrom */
  readonly animateFrom: SeenRects;
  /** ⑤ で留めた泡の id（何が留まったかを検証で見るため） */
  readonly pinned: readonly BubbleId[];
}

/**
 * 操作の ctx を作る。
 * seen は「前のフレームで画面に見えていた矩形」＝ lab.html 1439 行の before（frameItems を写したもの）。
 * ラボは reshape の中で自分で写していたが、そこは補間後の矩形なので ui の持ちもの。ここでは渡してもらう。
 */
export function actContext(
  viewport: Size,
  seen: SeenRects,
  rules?: Partial<LayoutRules>,
  chrome?: ChromeMap,
): ActContext {
  return { viewport, seen, rules: resolveRules(rules), chrome };
}
