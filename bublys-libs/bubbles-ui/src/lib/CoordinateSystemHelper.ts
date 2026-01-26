import { Point2, SmartRect, CoordinateSystemData, CoordinateSystem } from "@bublys-org/bubbles-ui-util";

/**
 * レイヤーインデックスと座標設定から CoordinateSystemData を生成
 *
 * @param layerIndex レイヤーのインデックス（0が最前面）
 * @param config グローバルな座標系設定（offset と vanishingPoint）
 * @returns 指定レイヤーの CoordinateSystemData
 */
export function createCoordinateSystemForLayer(
  layerIndex: number,
  config: { offset: Point2; vanishingPoint: Point2 }
): CoordinateSystemData {
  return {
    layerIndex,
    offset: config.offset,
    vanishingPoint: config.vanishingPoint,
  };
}

/**
 * グローバル座標の点を、指定レイヤーのローカル座標系に変換
 * surfaceLeftTop の補正も含む
 *
 * 変換の流れ:
 * 1. グローバル座標 → レイヤーのローカル座標（SmartRect の変換ロジックを活用）
 * 2. レンダリング時のオフセット (surfaceLeftTop) を補正
 *
 * @param globalPoint グローバル座標の点
 * @param layerIndex 目標レイヤーのインデックス
 * @param coordinateConfig グローバルな座標系設定
 * @param surfaceLeftTop レンダリング時に追加されるオフセット（通常 {x: 100, y: 100}）
 * @returns レイヤーのローカル座標系での点（moveTo() に渡せる座標）
 */
export function convertGlobalPointToLayerLocal(
  globalPoint: Point2,
  layerIndex: number,
  coordinateConfig: { offset: Point2; vanishingPoint: Point2 },
  surfaceLeftTop: Point2
): Point2 {
  // レイヤーの CoordinateSystem を生成
  const layerCoordinateSystem = createCoordinateSystemForLayer(
    layerIndex,
    coordinateConfig
  );

  // グローバル座標をレイヤーのローカル座標に変換
  const localPoint = CoordinateSystem.fromData(layerCoordinateSystem).transformGlobalToLocal(globalPoint);

  // レンダリング時に surfaceLeftTop が足されるので、ここで引いておく
  // moveTo() が期待するのは: position + surfaceLeftTop = レンダリング後の座標
  const relativePoint: Point2 = {
    x: localPoint.x - surfaceLeftTop.x,
    y: localPoint.y - surfaceLeftTop.y,
  };

  return relativePoint;
}

/**
 * グローバル座標の SmartRect を、指定レイヤーのローカル座標系に変換
 * surfaceLeftTop の補正も含む
 *
 * 変換の流れ:
 * 1. グローバル座標 → レイヤーのローカル座標（SmartRect.toLocal() を活用）
 * 2. レンダリング時のオフセット (surfaceLeftTop) を補正
 *
 * @param globalRect グローバル座標系の SmartRect
 * @param layerIndex 目標レイヤーのインデックス
 * @param coordinateConfig グローバルな座標系設定
 * @param surfaceLeftTop レンダリング時に追加されるオフセット（通常 {x: 100, y: 100}）
 * @returns レイヤーのローカル座標系に変換された SmartRect
 */
export function convertGlobalRectToLayerLocal(
  globalRect: SmartRect,
  layerIndex: number,
  coordinateConfig: { offset: Point2; vanishingPoint: Point2 },
  surfaceLeftTop: Point2
): SmartRect {
  // レイヤーの CoordinateSystem を生成
  const layerCoordinateSystem = createCoordinateSystemForLayer(
    layerIndex,
    coordinateConfig
  );

  // SmartRect.toLocal() を使って座標変換（既存のロジックを再利用）
  const localRect = globalRect.toLocal(layerCoordinateSystem);

  // レンダリング時に surfaceLeftTop が足されるので、ここで引いておく
  // レンダリング位置 = position + surfaceLeftTop
  const adjustedRect = new SmartRect(
    new DOMRect(
      localRect.x - surfaceLeftTop.x,
      localRect.y - surfaceLeftTop.y,
      localRect.width,
      localRect.height
    ),
    localRect.parentSize,
    layerCoordinateSystem
  );

  return adjustedRect;
}
