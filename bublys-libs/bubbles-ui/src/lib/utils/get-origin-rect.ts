import { SmartRect, CoordinateSystem } from '@bublys-org/bubbles-ui-util';

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
 * universe（StyledUniverse）要素を DOM から取得する
 * SmartRect の "GLOBAL" 座標系 = universe 座標系という今の取り決めに合わせ、
 * screen 座標を universe 座標に補正するために使う
 */
const getUniverseElement = (): HTMLElement | null => {
  if (typeof document === "undefined") return null;
  return document.querySelector('[data-bubble-universe]') as HTMLElement | null;
};

/**
 * screen 座標の DOMRect を universe 座標に変換する
 * universe 要素がスクロールで動いても、両者の差分（= universe 座標）は不変
 */
const toUniverseRect = (screenRect_vp: DOMRect): DOMRect => {
  const universeEl = getUniverseElement();
  if (!universeEl) return screenRect_vp;

  const universeRect_vp = universeEl.getBoundingClientRect();
  return new DOMRect(
    screenRect_vp.x - universeRect_vp.x,
    screenRect_vp.y - universeRect_vp.y,
    screenRect_vp.width,
    screenRect_vp.height,
  );
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
  const rect_uv = toUniverseRect(rect_vp);
  const parentSize = { width: window.innerWidth, height: window.innerHeight };

  return new SmartRect(rect_uv, parentSize, CoordinateSystem.GLOBAL.toData());
};
