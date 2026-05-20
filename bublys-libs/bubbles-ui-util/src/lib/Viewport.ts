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
 */
export class Viewport {
  constructor(
    /** universe 原点(0,0)の screen 座標（StyledUniverse の bbcr 左上） */
    private readonly universeScreenOrigin: Point2,
    /** 可視窓の左上の universe 座標（= スクロール量） */
    readonly scroll: Point2,
    /** 可視領域のピクセルサイズ */
    readonly size: Size2,
  ) {}

  /**
   * 計測した DOM rect から構築する。
   * @param universeScreenRect StyledUniverse の getBoundingClientRect（左上）
   * @param viewportScreenRect スクロール容器(StyledViewport)の getBoundingClientRect
   */
  static fromMeasuredRects(
    universeScreenRect: { x: number; y: number },
    viewportScreenRect: { x: number; y: number; width: number; height: number },
  ): Viewport {
    const universeScreenOrigin = {
      x: universeScreenRect.x,
      y: universeScreenRect.y,
    };
    // universe はスクロールで viewport 内を移動する。
    // scroll 量 = viewport 左上 - universe 左上（screen 座標差 = universe 座標）
    const scroll = {
      x: viewportScreenRect.x - universeScreenRect.x,
      y: viewportScreenRect.y - universeScreenRect.y,
    };
    const size = {
      width: viewportScreenRect.width,
      height: viewportScreenRect.height,
    };
    return new Viewport(universeScreenOrigin, scroll, size);
  }

  /** screen 座標 → universe 座標 */
  screenToUniverse(p: Point2): Point2 {
    return {
      x: p.x - this.universeScreenOrigin.x,
      y: p.y - this.universeScreenOrigin.y,
    };
  }

  /** universe 座標 → screen 座標 */
  universeToScreen(p: Point2): Point2 {
    return {
      x: p.x + this.universeScreenOrigin.x,
      y: p.y + this.universeScreenOrigin.y,
    };
  }

  /** 現在見えている universe 領域（origin=スクロール量、size=可視ピクセル） */
  visibleRegion(): { origin: Point2; size: Size2 } {
    return {
      origin: { x: this.scroll.x, y: this.scroll.y },
      size: { width: this.size.width, height: this.size.height },
    };
  }
}
