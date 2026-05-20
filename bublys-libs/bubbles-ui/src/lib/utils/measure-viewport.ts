import { Viewport } from "@bublys-org/bubbles-ui-util";

/**
 * DOM を計測して {@link Viewport}（純粋値オブジェクト）を構築する。
 *
 * StyledUniverse には data-bubble-universe 属性が付いており、その親が
 * スクロール容器(StyledViewport)。React の外（listener 等）からも
 * screen ⇄ universe 変換が必要なので、ここで DOM 計測を一元化する。
 *
 * @returns universe 要素が存在しない場合は null
 */
export const measureViewport = (): Viewport | null => {
  if (typeof document === "undefined") return null;
  const universeEl = document.querySelector(
    "[data-bubble-universe]",
  ) as HTMLElement | null;
  const scrollEl = universeEl?.parentElement ?? null;
  if (!universeEl || !scrollEl) return null;

  return Viewport.fromMeasuredRects(
    universeEl.getBoundingClientRect(),
    scrollEl.getBoundingClientRect(),
  );
};
