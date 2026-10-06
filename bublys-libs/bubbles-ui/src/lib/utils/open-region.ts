import type { Point2, Size2 } from "@bublys-org/bubbles-ui-util";
import { measureViewport } from "./measure-viewport.js";

/** 開いたバブルと画面の縁とのあいだに残す余白（px） */
const OPEN_MARGIN = 16;

/**
 * root の海で**いま見えている範囲**を、surface レイヤーの layer-local 座標で返す。
 * 開いたバブルをここへ収める（{@link Bubble.fitInto}）ために使う。縁には少し余白を残す。
 *
 * 測り方は BubbleView の最大化と同じ：見えている範囲の左上が surface の layer-local 位置、
 * 大きさは surface の内側（レイヤー原点 `surfaceOrigin` のぶんを引く）。
 *
 * @returns DOM がまだ無ければ null
 */
export const measureOpenRegion = (surfaceOrigin: Point2): { origin: Point2; size: Size2 } | null => {
  const viewport = measureViewport();
  if (!viewport) return null;
  const visible = viewport.visibleRegion();
  return {
    origin: { x: visible.origin.x + OPEN_MARGIN, y: visible.origin.y + OPEN_MARGIN },
    size: {
      width: visible.size.width - surfaceOrigin.x - OPEN_MARGIN * 2,
      height: visible.size.height - surfaceOrigin.y - OPEN_MARGIN * 2,
    },
  };
};
