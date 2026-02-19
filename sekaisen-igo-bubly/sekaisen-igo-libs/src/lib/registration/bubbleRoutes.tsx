"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { IgoGameProvider } from "../feature/IgoGameProvider.js";
import { IgoGameFeature } from "../feature/IgoGameFeature.js";
import { GameListFeature } from "../feature/GameListFeature.js";
import { WorldLineFeature } from "../feature/WorldLineFeature.js";

export const sekaisenIgoBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "sekaisen-igo/games/:gameId/history",
    type: "igo-world-line",
    bubbleOptions: { contentBackground: "transparent" },
    Component: ({ bubble }) => (
      <IgoGameProvider>
        <WorldLineFeature gameId={bubble.params.gameId} bubbleId={bubble.id} />
      </IgoGameProvider>
    ),
  },
  {
    pattern: "sekaisen-igo/games/:gameId",
    type: "igo-game",
    Component: ({ bubble }) => (
      <IgoGameProvider>
        <IgoGameFeature gameId={bubble.params.gameId} bubbleId={bubble.id} />
      </IgoGameProvider>
    ),
  },
  {
    pattern: "sekaisen-igo/games",
    type: "game-list",
    Component: () => (
      <IgoGameProvider>
        <GameListFeature />
      </IgoGameProvider>
    ),
  },
];

// BubbleRouteRegistryに登録
BubbleRouteRegistry.registerRoutes(sekaisenIgoBubbleRoutes);
