import { SmartRect, CoordinateSystem } from '@bublys-org/bubbles-ui-util';
import { measureViewportForElement } from './measure-viewport.js';

/**
 * 複数のDOMRectをマージして、それらを包含する最小の矩形を返す
 */
export const mergeDOMRects = (rects: DOMRect[]): DOMRect => {
  if (rects.length === 0) {
    return new DOMRect(0, 0, 0, 0);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};

/**
 * 要素のBoundingClientRectを取得する（screen 座標 = browser viewport 起点）
 * display:contentsの要素の場合は、直接の子要素すべてのrectをマージして返す
 */
export const getElementRect = (element: HTMLElement): DOMRect => {
  const style = window.getComputedStyle(element);

  if (style.display === 'contents') {
    // display:contentsの場合、直接の子要素のrectをすべて取得してマージ
    const childRects: DOMRect[] = [];
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as HTMLElement;
      childRects.push(child.getBoundingClientRect());
    }
    return mergeDOMRects(childRects);
  }

  return element.getBoundingClientRect();
};

/**
 * screen 座標の DOMRect を、origin 要素が属する universe の座標に変換する。
 * ネストした universe では origin 要素の最寄り universe を基準にする。
 * universe 要素が無い場合は screen 座標のまま返す（後方互換）。
 *
 * Viewport は親 CSS scale も吸収するので、ネストの奥のレイヤーに居る universe
 * 内の要素でも universe 単位で正しく取れる（位置・サイズとも scale ぶん補正）。
 */
const toUniverseRect = (
  screenRect: DOMRect,
  originEl: HTMLElement,
): { rect: DOMRect; viewport: ReturnType<typeof measureViewportForElement> } => {
  const viewport = measureViewportForElement(originEl);
  if (!viewport) return { rect: screenRect, viewport: null };

  const topLeft = viewport.screenToUniverse({
    x: screenRect.x,
    y: screenRect.y,
  });
  const universeSize = viewport.screenSizeToUniverse({
    width: screenRect.width,
    height: screenRect.height,
  });
  return {
    rect: new DOMRect(topLeft.x, topLeft.y, universeSize.width, universeSize.height),
    viewport,
  };
};

/**
 * opener bubble内のUrledPlace要素（data-url属性を持つ要素）のrectを取得する
 *
 * @param openerBubbleId - opener bubbleのID
 * @param targetUrl - 検索対象のURL（data-url属性の値）
 * @returns SmartRect（universe 座標系 = GLOBAL）またはundefined
 */
export const getOriginRect = (
  openerBubbleId: string,
  targetUrl: string
): SmartRect | undefined => {
  if (typeof document === "undefined") return undefined;

  const escapedUrl = CSS?.escape ? CSS.escape(targetUrl) : targetUrl;
  const selector = `[data-url="${escapedUrl}"]`;

  const openerContainer = document.querySelector(
    `[data-bubble-id="${openerBubbleId}"]`
  ) as HTMLElement | null;

  const originEl = openerContainer
    ? (openerContainer.querySelector(selector) as HTMLElement | null)
    : (document.querySelector(selector) as HTMLElement | null);

  if (!originEl) return undefined;

  const rect_vp = getElementRect(originEl);
  const { rect: rect_uv, viewport } = toUniverseRect(rect_vp, originEl);
  // 親サイズ = SmartRect の空きスペース計算の基準。ネスト時はその universe の
  // 可視サイズ（universe 単位）、Provider 外なら window を使う。
  const parentSize = viewport
    ? viewport.size
    : { width: window.innerWidth, height: window.innerHeight };

  return new SmartRect(rect_uv, parentSize, CoordinateSystem.GLOBAL.toData());
};
