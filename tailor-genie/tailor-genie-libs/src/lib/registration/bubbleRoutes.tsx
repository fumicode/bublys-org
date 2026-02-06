"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { User } from "@bublys-org/tailor-genie-model";
import { ConversationFeature } from "../feature/ConversationFeature.js";
import { ConversationListFeature } from "../feature/ConversationListFeature.js";

// デモ用ユーザー（実際はpropsや別の方法で渡す）
const DEMO_USERS: User[] = [
  new User({ id: "user-1", name: "Alice" }),
  new User({ id: "user-2", name: "Bob" }),
];

export const tailorGenieBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "tailor-genie/conversations/:convId",
    type: "tailor-genie-conversation",
    Component: ({ bubble }) => (
      <ConversationFeature
        users={DEMO_USERS}
        conversationId={bubble.params.convId}
      />
    ),
  },
  {
    pattern: "tailor-genie/conversations",
    type: "tailor-genie-conversations",
    Component: () => <ConversationListFeature />,
  },
];

// BubbleRouteRegistryに登録
BubbleRouteRegistry.registerRoutes(tailorGenieBubbleRoutes);
