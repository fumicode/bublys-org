import type { Point2, Size2 } from "@bublys-org/bubbles-ui-util";

/**
 * ★ **小さい画面（スマホなど）では、手前のバブルが画面を使い切る。**
 *   広い画面では、奥のレイヤーを覗かせるために海の左上を空け（`surfaceLeftTop`）、
 *   脇にメニューの帯を立てている。幅 390px の画面でこれをやると、バブルに残るのは
 *   200px ほどで、中身が潰れて読めない（実測：勤務表の表が 144px 幅になっていた）。
 *   横持ち（844×390）でも、高さが 210px しか残らなかった。
 *   小さい画面では奥を覗かせるのをやめ、表に出ているバブルを見えている範囲いっぱいに
 *   広げる（BublyApp）。メニューの帯は、幅が狭いときだけ下へ寝かせる（横持ちでは
 *   高さのほうが貴重なので脇のまま）。
 *
 * 決め手は**画面の大きさだけ**。端末の種類やタッチの有無では分けない。
 */
export const NARROW_SCREEN_MAX_WIDTH = 600;
export const SHORT_SCREEN_MAX_HEIGHT = 500;

/** 幅が狭いか（スマホの縦持ちなど）。0 はまだ測っていないので狭いとしない */
export const isNarrowScreen = (width: number): boolean =>
  width > 0 && width < NARROW_SCREEN_MAX_WIDTH;

/** 小さい画面か：幅が狭い、または高さが低い（スマホの横持ち） */
export const isSmallScreen = ({ width, height }: Size2): boolean =>
  isNarrowScreen(width) || (height > 0 && height < SHORT_SCREEN_MAX_HEIGHT);

/** 広い画面の海の左上の空き（奥のレイヤーをどれだけ覗かせるか） */
const WIDE_SURFACE_LEFT_TOP: Point2 = { x: 100, y: 100 };
/** 小さい画面では奥を覗かせない */
const SMALL_SURFACE_LEFT_TOP: Point2 = { x: 0, y: 0 };

export const surfaceLeftTopFor = (screen: Size2): Point2 =>
  isSmallScreen(screen) ? SMALL_SURFACE_LEFT_TOP : WIDE_SURFACE_LEFT_TOP;

/** 開いたバブルと画面の縁とのあいだに残す余白（px）。小さい画面では詰める */
export const openMarginFor = (visible: Size2): number => (isSmallScreen(visible) ? 4 : 16);
