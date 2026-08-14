import { Point2, Size2 } from "./Point.js";

/**
 * universe を覗き込む窓。純粋な値オブジェクト。
 *
 * 座標系の用語:
 * - screen 座標 = ブラウザ窓基準（getBoundingClientRect が返す値）
 * - universe 座標 = StyledUniverse 内の絶対座標（スクロール不変）
 *
 * ネイティブスクロールの screen ⇄ universe 対応はブラウザが管理するため、
 * その関係を表す値（universe 原点の screen 位置とスクロール量）を
 * DOM 計測から構築する。計測自体は feature 層が行い、ここは純粋に保つ。
 *
 * **parent scale について**: この universe を表示している親の DOM が CSS
 * `transform: scale()` で縮小されている場合（例: universe バブル自身が root の
 * 奥のレイヤーに置かれているとき）、getBoundingClientRect は縮小済みの screen
 * pixel を返す。universe 座標は CSS pixel（= unscaled）で持っているので、
 * 変換時に `parentScale` で除算する必要がある。`scroll` と `size` も同様に
 * universe 単位で返すよう構築時に補正する。
 */
export class Viewport {
  constructor(
    /** universe 原点(0,0)の screen 座標（StyledUniverse の bbcr 左上） */
    private readonly universeScreenOrigin: Point2,
    /** 可視窓の左上の universe 座標（= スクロール量、universe 単位） */
    readonly scroll: Point2,
    /** 可視領域の universe 単位サイズ（screen pixel ではない） */
    readonly size: Size2,
    /** この universe DOM に効いている親 CSS scale（無いときは 1） */
    readonly parentScale: number = 1,
  ) {}

  /**
   * 計測した DOM rect から構築する。
   * @param universeScreenRect StyledUniverse の getBoundingClientRect（左上）
   * @param viewportScreenRect スクロール容器(StyledViewport)の getBoundingClientRect
   * @param parentScale この universe に効いている親 CSS scale（既定 1）。
   *   `universeEl.getBoundingClientRect().width / universeEl.offsetWidth` で算出。
   */
  static fromMeasuredRects(
    universeScreenRect: { x: number; y: number },
    viewportScreenRect: { x: number; y: number; width: number; height: number },
    parentScale = 1,
  ): Viewport {
    // 0 や負の異常値で割らない（DOMがまだ無いタイミングへの保険）
    const s = parentScale > 0 ? parentScale : 1;
    const universeScreenOrigin = {
      x: universeScreenRect.x,
      y: universeScreenRect.y,
    };
    // universe はスクロールで viewport 内を移動する。
    // scroll 量 = viewport 左上 - universe 左上（screen 座標差）を universe 単位に直す。
    const scroll = {
      x: (viewportScreenRect.x - universeScreenRect.x) / s,
      y: (viewportScreenRect.y - universeScreenRect.y) / s,
    };
    const size = {
      width: viewportScreenRect.width / s,
      height: viewportScreenRect.height / s,
    };
    return new Viewport(universeScreenOrigin, scroll, size, s);
  }

  /** screen 座標 → universe 座標 */
  screenToUniverse(p: Point2): Point2 {
    return {
      x: (p.x - this.universeScreenOrigin.x) / this.parentScale,
      y: (p.y - this.universeScreenOrigin.y) / this.parentScale,
    };
  }

  /** universe 座標 → screen 座標 */
  universeToScreen(p: Point2): Point2 {
    return {
      x: p.x * this.parentScale + this.universeScreenOrigin.x,
      y: p.y * this.parentScale + this.universeScreenOrigin.y,
    };
  }

  /** screen 単位のサイズ（bbcr 由来）を universe 単位に直す */
  screenSizeToUniverse(size: Size2): Size2 {
    return {
      width: size.width / this.parentScale,
      height: size.height / this.parentScale,
    };
  }

  /** 現在見えている universe 領域（origin=スクロール量、size=可視サイズ、いずれも universe 単位） */
  visibleRegion(): { origin: Point2; size: Size2 } {
    return {
      origin: { x: this.scroll.x, y: this.scroll.y },
      size: { width: this.size.width, height: this.size.height },
    };
  }
}
