// Bubble Routes (このファイルをimportすると自動登録される)
import "./lib/registration/bubbleRoutes.js";
export { sekaisenIgoBubbleRoutes } from "./lib/registration/bubbleRoutes.js";

// View
export { IgoBoardView, GameInfoView } from "./lib/view/IgoBoardView.js";

// Feature
export { IgoGameFeature } from "./lib/feature/IgoGameFeature.js";
export type { IgoGameFeatureProps } from "./lib/feature/IgoGameFeature.js";
export { GameListFeature } from "./lib/feature/GameListFeature.js";

// Provider
export { IgoGameProvider, useIgoGame, gameScopeId } from "./lib/feature/IgoGameProvider.js";
