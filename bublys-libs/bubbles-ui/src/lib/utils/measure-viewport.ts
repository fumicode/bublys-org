import { Viewport } from "@bublys-org/bubbles-ui-util";

/** universe 要素とその親(スクロール容器)から Viewport を構築 */
const viewportFromUniverseEl = (universeEl: HTMLElement | null): Viewport | null => {
  const scrollEl = universeEl?.parentElement ?? null;
  if (!universeEl || !scrollEl) return null;
  // この universe DOM に親から効いている CSS scale を bbcr.width/offsetWidth で推定。
  // 例: universe バブル自身が root の奥のレイヤーに居て scale(0.9) されている場合、
  //  bbcr.width = offsetWidth * 0.9。これを Viewport に渡すことで screen⇄universe
  //  変換が縮小ぶんを吸収し、内側の popChild 位置などがズレなくなる。
  const bbcr = universeEl.getBoundingClientRect();
  const intrinsicW = universeEl.offsetWidth;
  const parentScale = intrinsicW > 0 ? bbcr.width / intrinsicW : 1;
  return Viewport.fromMeasuredRects(
    bbcr,
    scrollEl.getBoundingClientRect(),
    parentScale,
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
 * 指定要素が属する universe の要素（data-bubble-universe）を返す。
 *
 * 通常は最寄りの祖先。ただし要素が岸の帯（data-showre-side）の中に居るときは、
 * 帯は海の外側（同じ岸 + 海レイアウトの兄弟）に居るので、祖先を辿ると
 * **親 universe の海**に当たってしまう。帯の中の要素はその帯が属する
 * レイアウトの海（= 同じ universe）に属するものとして扱う。
 *
 * 帯の中にさらに universe（岸に着いた universe バブル）が居る場合は、そちらが近い
 * のでそのまま最寄りの祖先を使う。
 */
export const universeElementOf = (el: HTMLElement): HTMLElement | null => {
  const nearestUniverse = el.closest("[data-bubble-universe]") as HTMLElement | null;
  const bar = el.closest("[data-showre-side]") as HTMLElement | null;
  if (bar && !(nearestUniverse && bar.contains(nearestUniverse))) {
    const layout = bar.closest("[data-showre-layout]");
    // レイアウト直下で最初に見つかる海が自分の海（入れ子の海はその中に居る）
    const ownSea = layout?.querySelector("[data-bubble-universe]") as HTMLElement | null;
    return ownSea ?? nearestUniverse;
  }
  return nearestUniverse;
};

/**
 * 指定要素が属する universe（{@link universeElementOf}）の Viewport を構築する。
 * ネストした universe では root ではなくその要素自身の universe を基準にする必要がある。
 */
export const measureViewportForElement = (el: HTMLElement | null): Viewport | null => {
  if (!el) return null;
  return viewportFromUniverseEl(universeElementOf(el));
};
