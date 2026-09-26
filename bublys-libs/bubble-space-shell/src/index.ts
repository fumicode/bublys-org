/**
 * **海の器** ── 泡を並べる海を、器ごと 1 つ立てるための lib。
 *
 * 中身（何が開けるか・何が定位置に居るか）は持たない。OS も、単体で開いたバブリも、
 * ここの `BubbleSea` を被れば**同じ海**になる。
 */
export { BubbleSea, type BubbleSeaProps } from './lib/BubbleSea.js';
export { ShoreSpace, type ShoreSpaceProps, type Home } from './lib/ShoreSpace.js';
export { ShowreLayer, SEA_GROUND, WINDOW_GROUND, resolveDock, seaCornerRadius, type Docked } from './lib/ShowreLayer.js';
export { ShoreLockProvider, ShoreLockButton, useShoreLock } from './lib/ShoreLock.js';
export { bridgeRoutes } from './lib/legacyRouteBridge.js';
export { SpaceViewContext, useSpaceView, type SpaceView } from './lib/SpaceViewContext.js';
export { SpaceViewBubble } from './lib/SpaceViewBubble.js';
export { FullscreenToggle } from './lib/FullscreenToggle.js';
export {
  SeaArrangement,
  SEA_ARRANGEMENT_TYPE,
  SEA_ARRANGEMENT_ID,
  SEA_ARRANGEMENT_DOMAIN,
  useSeaWorldLine,
} from './lib/SeaWorldLine.js';
