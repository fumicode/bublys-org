"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { ConversationFeature } from "../feature/ConversationFeature.js";
import { ConversationListFeature } from "../feature/ConversationListFeature.js";
import { SpeakerFeature } from "../feature/SpeakerFeature.js";
import { SpeakerListFeature } from "../feature/SpeakerListFeature.js";
import { SpeakerDetailFeature } from "../feature/SpeakerDetailFeature.js";
import { WorldLineControlFeature } from "../feature/WorldLineControlFeature.js";

export const tailorGenieBubbleRoutes: BubbleRoute[] = [
  // World Line control
  {
    pattern: "tailor-genie/world-line",
    type: "tailor-genie-world-line",
    Component: () => <WorldLineControlFeature />,
  },
  // Speaker routes
  {
    pattern: "tailor-genie/speakers/:speakerId",
    type: "tailor-genie-speaker-detail",
    Component: ({ bubble }) => (
      <SpeakerDetailFeature speakerId={bubble.params.speakerId} />
    ),
  },
  {
    pattern: "tailor-genie/speakers",
    type: "tailor-genie-speakers",
    Component: () => <SpeakerListFeature />,
  },
  // Conversation routes
  {
    pattern: "tailor-genie/conversations/:convId/speakers/:speakerId",
    type: "tailor-genie-conversation-speaker",
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
      <ConversationFeature conversationId={bubble.params.convId} />
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
