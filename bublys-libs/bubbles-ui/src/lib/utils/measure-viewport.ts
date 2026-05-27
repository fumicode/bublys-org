import { Viewport } from "@bublys-org/bubbles-ui-util";

/** universe 要素とその親(スクロール容器)から Viewport を構築 */
const viewportFromUniverseEl = (universeEl: HTMLElement | null): Viewport | null => {
  const scrollEl = universeEl?.parentElement ?? null;
  if (!universeEl || !scrollEl) return null;
  return Viewport.fromMeasuredRects(
    universeEl.getBoundingClientRect(),
    scrollEl.getBoundingClientRect(),
  );
};

/**
 * DOM を計測して {@link Viewport}（純粋値オブジェクト）を構築する。
 *
 * StyledUniverse には data-bubble-universe 属性が付いており、その親が
 * スクロール容器(StyledViewport)。React の外（listener 等）からも
 * screen ⇄ universe 変換が必要なので、ここで DOM 計測を一元化する。
 *
 * 注: 最初の universe 要素（= root）を使う。特定の universe を対象にしたい場合は
 * {@link measureViewportForElement} を使うこと。
 *
 * @returns universe 要素が存在しない場合は null
 */
export const measureViewport = (): Viewport | null => {
  if (typeof document === "undefined") return null;
  return viewportFromUniverseEl(
    document.querySelector("[data-bubble-universe]") as HTMLElement | null,
  );
};

/**
 * 指定要素が属する universe（最寄りの祖先 data-bubble-universe）の Viewport を構築する。
 * ネストした universe では root ではなくその要素自身の universe を基準にする必要がある。
 */
export const measureViewportForElement = (el: HTMLElement | null): Viewport | null => {
  if (!el) return null;
  return viewportFromUniverseEl(
    el.closest("[data-bubble-universe]") as HTMLElement | null,
  );
};
