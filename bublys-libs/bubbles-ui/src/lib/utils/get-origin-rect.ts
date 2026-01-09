import { SmartRect, CoordinateSystem } from '../SmartRect.js';

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
 * 要素のBoundingClientRectを取得する
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
 * opener bubble内のUrledPlace要素（data-url属性を持つ要素）のrectを取得する
 *
 * @param openerBubbleId - opener bubbleのID
 * @param targetUrl - 検索対象のURL（data-url属性の値）
 * @returns SmartRect（グローバル座標系）またはundefined
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

  const rect = getElementRect(originEl);
  const parentSize = { width: window.innerWidth, height: window.innerHeight };

  return new SmartRect(rect, parentSize, CoordinateSystem.GLOBAL.toData());
};
