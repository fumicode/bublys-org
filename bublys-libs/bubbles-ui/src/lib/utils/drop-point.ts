import type { Point2 } from "@bublys-org/bubbles-ui-util";
import { measureViewportForElement } from "./measure-viewport.js";

/**
 * ドロップされた画面上の点を universe 座標に直す。
 *
 * これは `get-origin-rect.ts` が「クリック元の DOM 矩形」に対してやっていることの、
 * 点版。違いは、矩形は DOM を見ればいつでも測り直せるのに対し、ドロップ位置は
 * その瞬間にしか存在しないので、測った値を持ち回る必要があること。
 *
 * @param screenPoint ドロップイベントの clientX/clientY
 * @param universeEl  対象 universe の DOM 要素（`data-bubble-universe`）。
 *   ネストした universe でも、その要素を渡せばその universe の座標で返る。
 * @returns universe 座標の点。universe 要素が測れないときは undefined。
 */
export const dropPointToUniverse = (
  screenPoint: Point2,
  universeEl: HTMLElement | null,
): Point2 | undefined => {
  const viewport = measureViewportForElement(universeEl);
  if (!viewport) return undefined;
  return viewport.screenToUniverse(screenPoint);
};
