/**
 * **岸に貼る家具** ── どの空間にも居てよい泡と、その定位置。
 *
 * 海そのものは `@bublys-org/bubble-space-shell`。ここはその上に載る
 * 「世界線・見え方の口・ポケット・ランチャー」の 4 つだけを持つ。
 * OS も、この lib を被った別の SPA も、同じ家具で同じ手ざわりになる。
 */
export { PocketBubble } from "./lib/PocketBubble.js";
export { WorldLineHomeBubble, WORLD_LINES_URL, ROOT_SEA_SCOPE } from "./lib/WorldLineHomeBubble.js";
export {
  furnitureBubbleRoutes,
  POCKET_URL,
  SPACE_VIEW_URL,
} from "./lib/furnitureRoutes.js";
export {
  LAUNCHER_WIDTH,
  ICON,
  GAP,
  BAR_HEIGHT,
  SPACE_VIEW_SIZE,
  isNarrow,
  topRowAt,
  makeLauncherDock,
  makeSpaceViewDock,
  makePocketDock,
  makeWorldLinesDock,
  type NarrowSeat,
} from "./lib/docks.js";
export { useEnsureLauncherEntity, type EnsureLauncherOptions } from "./lib/useEnsureLauncher.js";
