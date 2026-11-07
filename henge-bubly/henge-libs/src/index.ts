/**
 * 化（henge）バブリの公開口。
 *
 * 層（CLAUDE.md）:
 *   domain  … @bublys-org/henge-model（純粋 TS）
 *   ui      … 描くだけ。Redux も世界線も知らない
 *   feature … 世界線と繋ぐ
 */

// 自分の型を名乗る（副作用）
import "./object-type-registration.js";
export { HENGE_GAME_OBJECT_TYPE } from "./object-type-registration.js";

// UI
export { GameListView } from "./ui/GameListView.js";
export type { GameListViewProps } from "./ui/GameListView.js";
export { HengeGameView } from "./ui/HengeGameView.js";
export type { HengeGameViewProps } from "./ui/HengeGameView.js";

// Feature
export { GameListFeature } from "./feature/GameListFeature.js";
export { HengeGameFeature } from "./feature/HengeGameFeature.js";
export type { HengeGameFeatureProps } from "./feature/HengeGameFeature.js";
export { WorldLineFeature } from "./feature/WorldLineFeature.js";
export type { WorldLineFeatureProps } from "./feature/WorldLineFeature.js";

// Provider（器）
export {
  HengeGameProvider,
  useHengeGame,
  gameScopeId,
  HENGE_GAME_TYPE,
  HENGE_GAME_META_TYPE,
} from "./feature/HengeGameProvider.js";

// Registration（バブルルート）
export { hengeBubbleRoutes } from "./registration/bubbleRoutes.js";
