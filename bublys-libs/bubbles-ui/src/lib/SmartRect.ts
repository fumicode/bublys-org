import { Point2, Size2 } from "./00_Point.js";

/**
 * 座標系情報（2D一次変換）
 * SmartRectがどの座標系で表現されているかを示す
 *
 * 数学的には以下の一次変換を表現：
 * global = vanishingPoint + (local - vanishingPoint) * scale + offset
 *
 * プロパティ:
 * - layerIndex: レイヤーのインデックス（0が最前面、数字が大きいほど奥）
 *   - scaleはlayerIndexから計算される: scale = 1 - layerIndex * 0.1
 * - offset: 平行移動（translation）
 * - vanishingPoint: スケール変換の基準点（transform-origin）
 *
 * 座標系の合成:
 * - withCoordinateSystem(): 部分的なオーバーライド
 * - TODO: 数学的な合成（行列的な合成）を実装する場合はcomposeWith()を追加
 */
export type CoordinateSystem = {
  layerIndex: number;
  offset: Point2;
  vanishingPoint: Point2;
};

/**
 * レイヤーインデックスからscaleを計算
 * レイヤーが奥ほどscaleが小さくなる（一点透視図法）
 */
export function calculateLayerScale(layerIndex: number): number {
  return 1 - layerIndex * 0.1;
}

/**
 * CoordinateSystemからscaleを取得
 * layerIndexから計算される
 */
export function getScale(coordinateSystem: CoordinateSystem): number {
  return calculateLayerScale(coordinateSystem.layerIndex);
}

/**
 * レイヤーの座標系を作成
 */
export function createLayerCoordinateSystem(
  layerIndex: number,
  offset: Point2,
  vanishingPoint: Point2
): CoordinateSystem {
  return {
    layerIndex,
    offset,
    vanishingPoint,
  };
}

/**
 * グローバル座標系（デフォルト）
 * layerIndex=0 (scale=1.0), offset=(0,0), vanishingPoint=(0,0)
 */
export const GLOBAL_COORDINATE_SYSTEM: CoordinateSystem = {
  layerIndex: 0,
  offset: { x: 0, y: 0 },
  vanishingPoint: { x: 0, y: 0 },
};

export type SmartRectJson = {
  x: number;
  y: number;
  width: number;
  height: number;
  parentSize: Size2;
  coordinateSystem?: CoordinateSystem;
};

export type Direction = "top" | "right" | "bottom" | "left";
const directions: Direction[] = ["top", "right", "bottom", "left"];

export type CornerPosition = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export type Side = "top" | "right" | "bottom" | "left";

/**
 * SmartRect wraps a DOMRectReadOnly and provides utility getters.
 * Includes serialization support via toJSON() and static fromJSON().
 *
 * 周囲の位置は以下のように番号付けされています:
 * [1][2][3]
 * [4]■[6]
 * [7][8][9]
 *
 * - 角（corners）: [1][3][7][9] - 斜め4つの位置
 * - 隣（neighbors）: [2][4][6][8] - 上下左右4つの位置
 * - 側（sides）: 角と隣を含む領域
 *   - 上側（top）: [1][2][3]
 *   - 左側（left）: [1][4][7]
 *   - 右側（right）: [3][6][9]
 *   - 下側（bottom）: [7][8][9]
 */
export class SmartRect implements DOMRectReadOnly {
  constructor(
    readonly domRect: DOMRectReadOnly,
    readonly parentSize: Size2,
    readonly coordinateSystem: CoordinateSystem = GLOBAL_COORDINATE_SYSTEM
  ) {}

  get x() {
    return this.domRect.x;
  }
  get y() {
    return this.domRect.y;
  }
  get position(): Point2 {
    return { x: this.x, y: this.y };
  }


  get width() {
    return this.domRect.width;
  }
  get height() {
    return this.domRect.height;
  }
  get size() : Size2 {
    return { width: this.width, height: this.height };
  }
  get top() {
    return this.domRect.top;
  }
  get right() {
    return this.domRect.right;
  }
  get bottom() {
    return this.domRect.bottom;
  }
  get left() {
    return this.domRect.left;
  }

  get positions(): [number, number, number, number] {
    return [this.top, this.right, this.bottom, this.left];
  }

  get topSpace() {
    return this.domRect.top;
  }

  get leftSpace() {
    return this.domRect.left;
  }

  get rightSpace() {
    return this.parentSize.width - this.domRect.right;
  }

  get bottomSpace() {
    return this.parentSize.height - this.domRect.bottom;
  }

  get spaces(): [number, number, number, number] {
    return [this.topSpace, this.rightSpace, this.bottomSpace, this.leftSpace];
  }

  

  calcSpaceWideDirection(
    openingSize: Size2 = { width: 0, height: 0 }
  ): Direction {

    const spaces = this.spaces.map((space, index) => ({
      original: space,
      subtractedSpace:
        space - (index % 2 === 0 ? openingSize.height : openingSize.width),
    }));

    const maxSpace = Math.max(...spaces.map((space) => space.subtractedSpace));
    const maxIndex = spaces.findIndex(
      (space) => space.subtractedSpace === maxSpace
    );

    return directions[maxIndex];
  }

  calcPositionToOpen(openingSize: Size2): Point2 {
    const direction: Direction = this.calcSpaceWideDirection({width:0, height:0});

    let ret: Point2;

    if (direction === "top") {
      ret = {
        x: this.left,
        y: this.top - openingSize.height * 1.2 ,
      };

    } else if (direction === "right") {
      ret ={
        x: this.right,
        y: this.top,
      };

    } else if (direction === "bottom") {
      ret ={
        x: this.left,
        y: this.bottom,
      };

    } else if (direction === "left") {
      ret ={
        x: this.left - openingSize.width * 1.2 ,
        y: this.top,
      };
    }
    else {
      throw new Error("Unexpected direction");
    }

    return ret;
  }

  /**
   * Merge this SmartRect with another, returning the minimal bounding SmartRect.
   */
  merge(other: SmartRect): SmartRect {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    const width = right - x;
    const height = bottom - y;
    const domRect = new DOMRect(x, y, width, height);
    return new SmartRect(domRect, this.parentSize, this.coordinateSystem);
  }

  /**
   * 隣接する位置（上下左右）のSmartRectを生成
   * [2][4][6][8]の位置
   * 画面の端まで広がる矩形を返す
   */
  getNeighbor(direction: Direction): SmartRect {
    let x: number;
    let y: number;
    let width: number;
    let height: number;

    switch (direction) {
      case "top":
        x = this.x;
        y = 0;
        width = this.width;
        height = this.y;
        break;
      case "right":
        x = this.right;
        y = this.y;
        width = this.parentSize.width - this.right;
        height = this.height;
        break;
      case "bottom":
        x = this.x;
        y = this.bottom;
        width = this.width;
        height = this.parentSize.height - this.bottom;
        break;
      case "left":
        x = 0;
        y = this.y;
        width = this.x;
        height = this.height;
        break;
    }

    const domRect = new DOMRect(x, y, width, height);
    return new SmartRect(domRect, this.parentSize, this.coordinateSystem);
  }

  /**
   * 角の位置（斜め）のSmartRectを生成
   * [1][3][7][9]の位置
   * 画面の端まで広がる矩形を返す
   */
  getCorner(position: CornerPosition): SmartRect {
    let x: number;
    let y: number;
    let width: number;
    let height: number;

    switch (position) {
      case "topLeft":
        x = 0;
        y = 0;
        width = this.x;
        height = this.y;
        break;
      case "topRight":
        x = this.right;
        y = 0;
        width = this.parentSize.width - this.right;
        height = this.y;
        break;
      case "bottomLeft":
        x = 0;
        y = this.bottom;
        width = this.x;
        height = this.parentSize.height - this.bottom;
        break;
      case "bottomRight":
        x = this.right;
        y = this.bottom;
        width = this.parentSize.width - this.right;
        height = this.parentSize.height - this.bottom;
        break;
    }

    const domRect = new DOMRect(x, y, width, height);
    return new SmartRect(domRect, this.parentSize, this.coordinateSystem);
  }

  /**
   * 側面（角+隣を合成した領域）のSmartRectを取得
   * 例: getSide('top') => [1,2,3]を合成した1つのSmartRect
   */
  getSide(side: Side): SmartRect {
    switch (side) {
      case "top":
        return this.getCorner("topLeft")
          .merge(this.getNeighbor("top"))
          .merge(this.getCorner("topRight"));
      case "right":
        return this.getCorner("topRight")
          .merge(this.getNeighbor("right"))
          .merge(this.getCorner("bottomRight"));
      case "bottom":
        return this.getCorner("bottomLeft")
          .merge(this.getNeighbor("bottom"))
          .merge(this.getCorner("bottomRight"));
      case "left":
        return this.getCorner("topLeft")
          .merge(this.getNeighbor("left"))
          .merge(this.getCorner("bottomLeft"));
    }
  }

  /**
   * 周囲8つのSmartRectを取得
   * [1,2,3,4,6,7,8,9]の順番
   */
  getAllSurrounding(): SmartRect[] {
    return [
      this.getCorner("topLeft"),      // 1
      this.getNeighbor("top"),         // 2
      this.getCorner("topRight"),      // 3
      this.getNeighbor("left"),        // 4
      this.getNeighbor("right"),       // 6
      this.getCorner("bottomLeft"),    // 7
      this.getNeighbor("bottom"),      // 8
      this.getCorner("bottomRight"),   // 9
    ];
  }

  /**
   * 角4つのSmartRectを取得
   * [1,3,7,9]の順番
   */
  getAllCorners(): SmartRect[] {
    return [
      this.getCorner("topLeft"),       // 1
      this.getCorner("topRight"),      // 3
      this.getCorner("bottomLeft"),    // 7
      this.getCorner("bottomRight"),   // 9
    ];
  }

  /**
   * 隣接4つのSmartRectを取得
   * [2,4,6,8]の順番
   */
  getAllNeighbors(): SmartRect[] {
    return [
      this.getNeighbor("top"),         // 2
      this.getNeighbor("left"),        // 4
      this.getNeighbor("right"),       // 6
      this.getNeighbor("bottom"),      // 8
    ];
  }

  /**
   * このSmartRectをグローバル座標系に変換
   * 現在の座標系がローカルの場合、グローバル座標に変換する
   *
   * 変換式:
   * global = vanishingPoint + (local - vanishingPoint) * scale + offset
   */
  toGlobal(): SmartRect {
    if (this.coordinateSystem === GLOBAL_COORDINATE_SYSTEM) {
      return this; // すでにグローバル座標系
    }

    const { offset, vanishingPoint } = this.coordinateSystem;
    const scale = getScale(this.coordinateSystem);

    // 位置を変換
    const globalX = vanishingPoint.x + (this.x - vanishingPoint.x) * scale + offset.x;
    const globalY = vanishingPoint.y + (this.y - vanishingPoint.y) * scale + offset.y;

    // サイズもscaleの影響を受ける
    const globalWidth = this.width * scale;
    const globalHeight = this.height * scale;

    const domRect = new DOMRect(globalX, globalY, globalWidth, globalHeight);
    return new SmartRect(domRect, this.parentSize, GLOBAL_COORDINATE_SYSTEM);
  }

  /**
   * 一個下のレイヤーの同じ位置・サイズのSmartRectを生成
   * 現在のレイヤーインデックスから+1したレイヤーのSmartRectを返す
   */
  toLayerBelow(): SmartRect {
    const belowLayerIndex = this.coordinateSystem.layerIndex + 1;

    // 新しい座標系を作成
    const newCoordinateSystem = createLayerCoordinateSystem(
      belowLayerIndex,
      this.coordinateSystem.offset,
      this.coordinateSystem.vanishingPoint
    );

    // 同じ位置・サイズで新しい座標系のSmartRectを返す
    const domRect = new DOMRect(this.x, this.y, this.width, this.height);
    return new SmartRect(domRect, this.parentSize, newCoordinateSystem);
  }

  /**
   * CoordinateSystemの一部または全部をオーバーライドした新しいSmartRectを返す
   * 指定されなかったプロパティは現在のcoordinateSystemから継承される
   *
   * @example
   * // offsetだけをリセット（canvas座標系用）
   * rect.withCoordinateSystem({ offset: { x: 0, y: 0 } })
   *
   * // layerIndexを変更
   * rect.withCoordinateSystem({ layerIndex: 2 })
   *
   * // 複数のプロパティを変更
   * rect.withCoordinateSystem({ layerIndex: 1, offset: { x: 100, y: 0 } })
   */
  withCoordinateSystem(override: Partial<CoordinateSystem>): SmartRect {
    const newCoordinateSystem: CoordinateSystem = {
      layerIndex: override.layerIndex ?? this.coordinateSystem.layerIndex,
      offset: override.offset ?? this.coordinateSystem.offset,
      vanishingPoint: override.vanishingPoint ?? this.coordinateSystem.vanishingPoint,
    };

    const domRect = new DOMRect(this.x, this.y, this.width, this.height);
    return new SmartRect(domRect, this.parentSize, newCoordinateSystem);
  }

  /**
   * このSmartRectを指定されたローカル座標系に変換
   * 現在の座標系（通常はグローバル）から、指定されたローカル座標系に変換する
   *
   * 変換式:
   * local = vanishingPoint + (global - offset - vanishingPoint) / scale
   */
  toLocal(targetCoordinateSystem: CoordinateSystem): SmartRect {
    // まずグローバル座標系に変換（現在がローカルの場合）
    const globalRect = this.coordinateSystem === GLOBAL_COORDINATE_SYSTEM
      ? this
      : this.toGlobal();

    if (targetCoordinateSystem === GLOBAL_COORDINATE_SYSTEM) {
      return globalRect; // グローバル座標系への変換
    }

    const { offset, vanishingPoint } = targetCoordinateSystem;
    const scale = getScale(targetCoordinateSystem);

    // 位置を変換
    const localX = vanishingPoint.x + (globalRect.x - offset.x - vanishingPoint.x) / scale;
    const localY = vanishingPoint.y + (globalRect.y - offset.y - vanishingPoint.y) / scale;

    // サイズもscaleの影響を受ける
    const localWidth = globalRect.width / scale;
    const localHeight = globalRect.height / scale;

    const domRect = new DOMRect(localX, localY, localWidth, localHeight);
    return new SmartRect(domRect, this.parentSize, targetCoordinateSystem);
  }

  toJSON(): SmartRectJson {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      parentSize: this.parentSize,
      coordinateSystem: this.coordinateSystem,
    };
  }

  static fromJSON(json: SmartRectJson): SmartRect {
    const domRect = new DOMRect(json.x, json.y, json.width, json.height);
    return new SmartRect(
      domRect,
      json.parentSize,
      json.coordinateSystem || GLOBAL_COORDINATE_SYSTEM
    );
  }
}
