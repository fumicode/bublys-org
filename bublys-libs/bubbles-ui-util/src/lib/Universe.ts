import { Point2, Size2 } from "./Point.js";

/**
 * バブルが住む有界な空間（StyledUniverse の論理座標系）。
 * universe 座標はスクロール不変。
 *
 * 「縁から外へ出さない」というルールはここに集約する。
 */
export class Universe {
  constructor(readonly size: Size2) {}

  /** universe 座標を [0, size] に収める（上端/左端より外へ出さない） */
  clamp(p: Point2): Point2 {
    return {
      x: Math.min(Math.max(p.x, 0), this.size.width),
      y: Math.min(Math.max(p.y, 0), this.size.height),
    };
  }

  /** p が universe の範囲内か */
  contains(p: Point2): boolean {
    return (
      p.x >= 0 &&
      p.y >= 0 &&
      p.x <= this.size.width &&
      p.y <= this.size.height
    );
  }
}
