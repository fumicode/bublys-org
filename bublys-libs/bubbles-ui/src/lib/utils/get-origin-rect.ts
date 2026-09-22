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

  const openerContainer = document.querySelector(
    `[data-bubble-id="${openerBubbleId}"]`
  ) as HTMLElement | null;

  const find = (url: string): HTMLElement | null => {
    const escapedUrl = CSS?.escape ? CSS.escape(url) : url;
    const selector = `[data-url="${escapedUrl}"]`;
    return openerContainer
      ? (openerContainer.querySelector(selector) as HTMLElement | null)
      : (document.querySelector(selector) as HTMLElement | null);
  };

  // 世界線つきの url（`<base>@<node>`）は node が進むたびに変わるが、クリック元は
  // base で置かれている（ランチャーの「task-bubly」など）。見つからなければ base で探す
  const at = targetUrl.indexOf("@");
  const originEl = find(targetUrl) ?? (at > 0 ? find(targetUrl.slice(0, at)) : null);

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

/**
 * 岸に着いているバブルの帯要素（data-docked-bubble-id）の矩形を、そのバブルが属する
 * universe の座標で返す。浮いているバブルの renderedRect に相当するもの。
 * 岸に着いている間は BubbleView が描かれず renderedRect が古いままなので、
 * 開く位置や帯（リンク）の起点にはこちらを使う。
 */
export const getDockedBubbleRect = (bubbleId: string): SmartRect | undefined => {
  if (typeof document === "undefined") return undefined;
  const el = document.querySelector(
    `[data-docked-bubble-id="${bubbleId}"]`,
  ) as HTMLElement | null;
  if (!el) return undefined;
  const rect_vp = getElementRect(el);
  const { rect: rect_uv, viewport } = toUniverseRect(rect_vp, el);
  const parentSize = viewport
    ? viewport.size
    : { width: window.innerWidth, height: window.innerHeight };
  return new SmartRect(rect_uv, parentSize, CoordinateSystem.GLOBAL.toData());
};
