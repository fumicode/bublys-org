"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { IgoGameProvider } from "../feature/IgoGameProvider.js";
import { IgoGameFeature } from "../feature/IgoGameFeature.js";
import { GameListFeature } from "../feature/GameListFeature.js";

export const sekaisenIgoBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "sekaisen-igo/games/:gameId",
    type: "igo-game",
    Component: ({ bubble }) => (
      <IgoGameProvider>
        <IgoGameFeature gameId={bubble.params.gameId} />
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
