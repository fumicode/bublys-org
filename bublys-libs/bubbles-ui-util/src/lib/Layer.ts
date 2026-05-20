import { Point2 } from "./Point.js";
import { CoordinateSystem } from "./CoordinateSystem.js";

/**
 * universe 内の奥行き面（depth plane）。
 *
 * 「index=0 が最前面(surface)、index が大きいほど奥」。
 * 奥のレイヤーほど vanishingPoint に向かって縮小される。
 *
 * 役割は layer-local 座標 ⇄ universe 座標 の相互変換。
 * 算術カーネルは {@link CoordinateSystem} に委譲する
 * （CoordinateSystem.offset を「この面の universe 上の原点 = surfaceOrigin」とみなす）。
 * 呼び出し側は place / locate / scaleScreenDelta だけを使い、
 * 生の offset 加減算には触れない。
 */
export class Layer {
  private readonly cs: CoordinateSystem;

  constructor(
    /** 奥行きインデックス（0=最前面、大きいほど奥） */
    readonly index: number,
    /** この面の layer-local 原点が universe 上のどこか（最前面では surfaceLeftTop 相当） */
    readonly surfaceOrigin: Point2,
    /** 奥行きが収束する universe 座標 */
    readonly vanishingPoint: Point2,
  ) {
    this.cs = new CoordinateSystem(index, surfaceOrigin, vanishingPoint);
  }

  /** 奥行きスケール（index から導出。CSS transform: scale() 用） */
  get scale(): number {
    return this.cs.scale;
  }

  /** layer-local 座標 → universe 座標 */
  place(local: Point2): Point2 {
    return this.cs.transformLocalToGlobal(local);
  }

  /** universe 座標 → layer-local 座標 */
  locate(universe: Point2): Point2 {
    return this.cs.transformGlobalToLocal(universe);
  }

  /** スクリーン上のドラッグ移動量 → layer-local 移動量 */
  scaleScreenDelta(screenDelta: Point2): Point2 {
    return this.cs.transformScreenDeltaToLocal(screenDelta);
  }

  /** 同一原点・消失点で深さだけ違うレイヤー */
  atIndex(index: number): Layer {
    return new Layer(index, this.surfaceOrigin, this.vanishingPoint);
  }

  /** 移行期の相互運用用：内部 CoordinateSystem を取り出す */
  toCoordinateSystem(): CoordinateSystem {
    return this.cs;
  }

  /** 既存 CoordinateSystem から Layer を作る（offset を surfaceOrigin とみなす） */
  static fromCoordinateSystem(cs: CoordinateSystem): Layer {
    return new Layer(cs.layerIndex, cs.offset, cs.vanishingPoint);
  }
}
