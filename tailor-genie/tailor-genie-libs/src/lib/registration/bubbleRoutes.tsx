"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { Speaker } from "@bublys-org/tailor-genie-model";
import { ConversationFeature } from "../feature/ConversationFeature.js";
import { ConversationListFeature } from "../feature/ConversationListFeature.js";
import { SpeakerFeature } from "../feature/SpeakerFeature.js";

// デモ用スピーカー（実際はpropsや別の方法で渡す）
const DEMO_SPEAKERS: Speaker[] = [
  new Speaker({ id: "speaker-1", name: "Alice" }),
  new Speaker({ id: "speaker-2", name: "Bob" }),
];

export const tailorGenieBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "tailor-genie/conversations/:convId/speakers/:speakerId",
    type: "tailor-genie-speaker",
    Component: ({ bubble }) => (
      <SpeakerFeature
        conversationId={bubble.params.convId}
        speakerId={bubble.params.speakerId}
      />
    ),
  },
  {
    pattern: "tailor-genie/conversations/:convId",
    type: "tailor-genie-conversation",
    Component: ({ bubble }) => (
      <ConversationFeature
        speakers={DEMO_SPEAKERS}
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
