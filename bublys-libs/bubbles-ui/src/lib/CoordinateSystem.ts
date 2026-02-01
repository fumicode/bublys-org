import { Point2 } from "./00_Point.js";

/**
 * 座標系データ（JSON互換）
 * 後方互換性のために型エイリアスとして残す
 */
export type CoordinateSystemData = {
  layerIndex: number;
  offset: Point2;
  vanishingPoint: Point2;
};

/**
 * スケール計算の定数
 * レイヤーごとのスケール減少率
 */
const SCALE_DECAY_RATE = 0.1;

/**
 * スケール計算を開始するレイヤーインデックス
 * このインデックス未満のレイヤーはすべてscale=1.0
 * これにより、レイヤーが追加されてもクリック位置がずれない
 */
const SCALE_START_LAYER_INDEX = 1;

/**
 * 座標系クラス（2D一次変換）
 * SmartRectがどの座標系で表現されているかを示す
 *
 * 数学的には以下の一次変換を表現：
 * global = vanishingPoint + (local - vanishingPoint) * scale + offset
 *
 * プロパティ:
 * - layerIndex: レイヤーのインデックス（0が最前面、数字が大きいほど奥）
 *   - scaleはlayerIndexから計算される
 *   - layerIndex < SCALE_START_LAYER_INDEX の場合: scale = 1.0
 *   - それ以外: scale = 1 - (layerIndex - SCALE_START_LAYER_INDEX + 1) * SCALE_DECAY_RATE
 * - offset: 平行移動（translation）
 * - vanishingPoint: スケール変換の基準点（transform-origin）
 */
export class CoordinateSystem {
  constructor(
    readonly layerIndex: number,
    readonly offset: Point2,
    readonly vanishingPoint: Point2
  ) {}

  /**
   * このレイヤーのスケール値
   * layerIndex=0 → scale=1.0
   * layerIndex=1 → scale=1.0 (SCALE_START_LAYER_INDEX未満は1.0)
   * layerIndex=2 → scale=0.9
   * layerIndex=3 → scale=0.8
   * ...
   */
  get scale(): number {
    const effectiveIndex = Math.max(0, this.layerIndex - SCALE_START_LAYER_INDEX + 1);
    return 1 - effectiveIndex * SCALE_DECAY_RATE;
  }

  /**
   * CSSのtransform: scale()で使用する値
   */
  get cssScale(): number {
    return this.scale;
  }

  /**
   * マウス移動量（スクリーン座標）をローカル座標系での移動量に変換
   * ドラッグ時にマウスの動きに追従させるために使用
   *
   * スクリーン上でdx,dy動くと、ローカル座標ではdx/scale, dy/scale動く
   *
   * @param screenDelta スクリーン座標での移動量
   * @returns ローカル座標系での移動量
   */
  transformScreenDeltaToLocal(screenDelta: Point2): Point2 {
    return {
      x: screenDelta.x / this.scale,
      y: screenDelta.y / this.scale,
    };
  }

  /**
   * ローカル座標での移動量をスクリーン座標系での移動量に変換
   *
   * @param localDelta ローカル座標での移動量
   * @returns スクリーン座標系での移動量
   */
  transformLocalDeltaToScreen(localDelta: Point2): Point2 {
    return {
      x: localDelta.x * this.scale,
      y: localDelta.y * this.scale,
    };
  }

  /**
   * 指定したスクリーン位置でのtransform-originを計算
   * CSSのtransform-originに設定する値（要素の左上からの相対位置）
   *
   * @param screenPosition 要素のスクリーン座標（left, top）
   * @returns transform-originの値（要素左上からの相対座標）
   */
  calculateTransformOrigin(screenPosition: Point2): Point2 {
    return {
      x: this.vanishingPoint.x - screenPosition.x,
      y: this.vanishingPoint.y - screenPosition.y,
    };
  }

  /**
   * ローカル座標の点をグローバル座標系に変換
   *
   * 変換式: global = vanishingPoint + (local - vanishingPoint) * scale + offset
   *
   * @param localPoint ローカル座標系での点
   * @returns グローバル座標系での座標
   */
  transformLocalToGlobal(localPoint: Point2): Point2 {
    return {
      x: this.vanishingPoint.x + (localPoint.x - this.vanishingPoint.x) * this.scale + this.offset.x,
      y: this.vanishingPoint.y + (localPoint.y - this.vanishingPoint.y) * this.scale + this.offset.y,
    };
  }

  /**
   * グローバル座標の点をローカル座標系に変換
   *
   * 変換式: local = vanishingPoint + (global - offset - vanishingPoint) / scale
   *
   * @param globalPoint グローバル座標系での点
   * @returns ローカル座標系での座標
   */
  transformGlobalToLocal(globalPoint: Point2): Point2 {
    return {
      x: this.vanishingPoint.x + (globalPoint.x - this.offset.x - this.vanishingPoint.x) / this.scale,
      y: this.vanishingPoint.y + (globalPoint.y - this.offset.y - this.vanishingPoint.y) / this.scale,
    };
  }

  /**
   * 一つ下のレイヤーの座標系を取得
   */
  toLayerBelow(): CoordinateSystem {
    return new CoordinateSystem(
      this.layerIndex + 1,
      this.offset,
      this.vanishingPoint
    );
  }

  /**
   * 一つ上のレイヤーの座標系を取得
   */
  toLayerAbove(): CoordinateSystem {
    return new CoordinateSystem(
      Math.max(0, this.layerIndex - 1),
      this.offset,
      this.vanishingPoint
    );
  }

  /**
   * 指定したlayerIndexの座標系を取得
   */
  withLayerIndex(layerIndex: number): CoordinateSystem {
    return new CoordinateSystem(layerIndex, this.offset, this.vanishingPoint);
  }

  /**
   * offsetを変更した座標系を取得
   */
  withOffset(offset: Point2): CoordinateSystem {
    return new CoordinateSystem(this.layerIndex, offset, this.vanishingPoint);
  }

  /**
   * vanishingPointを変更した座標系を取得
   */
  withVanishingPoint(vanishingPoint: Point2): CoordinateSystem {
    return new CoordinateSystem(this.layerIndex, this.offset, vanishingPoint);
  }

  /**
   * JSON互換のデータ形式に変換
   */
  toData(): CoordinateSystemData {
    return {
      layerIndex: this.layerIndex,
      offset: this.offset,
      vanishingPoint: this.vanishingPoint,
    };
  }

  /**
   * JSON互換データから作成
   */
  static fromData(data: CoordinateSystemData): CoordinateSystem {
    return new CoordinateSystem(
      data.layerIndex,
      data.offset,
      data.vanishingPoint
    );
  }

  /**
   * レイヤーインデックスから簡易的に作成
   * offset, vanishingPointは原点
   */
  static fromLayerIndex(layerIndex: number): CoordinateSystem {
    return new CoordinateSystem(
      layerIndex,
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    );
  }

  /**
   * グローバル座標系（デフォルト）
   * layerIndex=0 (scale=1.0), offset=(0,0), vanishingPoint=(0,0)
   */
  static readonly GLOBAL = new CoordinateSystem(
    0,
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  );
}

