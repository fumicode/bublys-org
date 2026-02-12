// Bubble Routes (このファイルをimportすると自動登録される)
import "./lib/registration/bubbleRoutes.js";
export { sekaisenIgoBubbleRoutes } from "./lib/registration/bubbleRoutes.js";

// View
export { IgoBoardView, GameInfoView } from "./lib/view/IgoBoardView.js";
export { WorldLineView } from "./lib/view/WorldLineView.js";
export type { WorldLineViewProps } from "./lib/view/WorldLineView.js";

// Feature
export { IgoGameFeature } from "./lib/feature/IgoGameFeature.js";
export type { IgoGameFeatureProps } from "./lib/feature/IgoGameFeature.js";
export { GameListFeature } from "./lib/feature/GameListFeature.js";
export { WorldLineFeature } from "./lib/feature/WorldLineFeature.js";
export type { WorldLineFeatureProps } from "./lib/feature/WorldLineFeature.js";

// Provider
export { IgoGameProvider, useIgoGame, gameScopeId } from "./lib/feature/IgoGameProvider.js";
