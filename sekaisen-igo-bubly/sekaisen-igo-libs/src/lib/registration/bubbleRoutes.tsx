"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { IgoGameFeature } from "../feature/IgoGameFeature.js";
import { GameListFeature } from "../feature/GameListFeature.js";

export const sekaisenIgoBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "sekaisen-igo/games/:gameId",
    type: "igo-game",
    Component: ({ bubble }) => (
      <IgoGameFeature gameId={bubble.params.gameId} />
    ),
  },
  {
    pattern: "sekaisen-igo/games",
    type: "game-list",
    Component: () => <GameListFeature />,
  },
];

// BubbleRouteRegistryに登録
BubbleRouteRegistry.registerRoutes(sekaisenIgoBubbleRoutes);
