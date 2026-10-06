import { CoordinateSystem } from "@bublys-org/bubbles-ui-util";

/**
 * 奥のレイヤーに置いたバブルの CSS transform。
 *
 * 寄せ（depthShift）を先に当て、縮尺は最後。transform は右から順に効くので、
 * 寄せの translate は縮みの影響を受けず、DepthStyle の px そのままずれる。
 * `headerShift` はヘッダーを箱の外に出しきるためのずらし。
 */
export function depthTransform(layerIndex: number, headerShift: number): string {
  const cs = CoordinateSystem.fromLayerIndex(layerIndex);
  const { x, y } = cs.depthShift;
  return `translate(${x}px, ${y}px) translateY(${headerShift}px) scale(${cs.scale})`;
}
