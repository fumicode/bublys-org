"use client";

import { BubbleRoute, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";
import { TailorGenieProvider } from "../feature/TailorGenieProvider.js";
import { ConversationFeature } from "../feature/ConversationFeature.js";
import { ConversationListFeature } from "../feature/ConversationListFeature.js";
import { SpeakerFeature } from "../feature/SpeakerFeature.js";
import { SpeakerListFeature } from "../feature/SpeakerListFeature.js";
import { SpeakerDetailFeature } from "../feature/SpeakerDetailFeature.js";
import { ServerStateFeature } from "../feature/ServerStateFeature.js";
import { WorldLineGraphViewFeature } from "../feature/WorldLineGraphViewFeature.js";

export const tailorGenieBubbleRoutes: BubbleRoute[] = [
  // Speaker routes
  {
    pattern: "tailor-genie/speakers/:speakerId",
    type: "speaker",
    Component: ({ bubble }) => (
      <TailorGenieProvider>
        <SpeakerDetailFeature speakerId={bubble.params.speakerId} />
      </TailorGenieProvider>
    ),
  },
  {
    pattern: "tailor-genie/speakers",
    type: "speaker-list",
    Component: () => (
      <TailorGenieProvider>
        <SpeakerListFeature />
      </TailorGenieProvider>
    ),
  },
  // Conversation routes
  {
    pattern: "tailor-genie/conversations/:convId/speakers/:speakerId",
    type: "conversation-speaker",
    Component: ({ bubble }) => (
      <TailorGenieProvider>
        <SpeakerFeature
          conversationId={bubble.params.convId}
          speakerId={bubble.params.speakerId}
        />
      </TailorGenieProvider>
    ),
  },
  {
    pattern: "tailor-genie/conversations/:convId",
    type: "conversation",
    Component: ({ bubble }) => (
      <TailorGenieProvider>
        <ConversationFeature conversationId={bubble.params.convId} />
      </TailorGenieProvider>
    ),
  },
  {
    pattern: "tailor-genie/conversations",
    type: "conversation-list",
    Component: () => (
      <TailorGenieProvider>
        <ConversationListFeature />
      </TailorGenieProvider>
    ),
  },
  // Server State
  {
    pattern: "tailor-genie/server-state",
    type: "server-state",
    Component: () => <ServerStateFeature />,
  },
  // World-Line Graph View
  {
    pattern: "tailor-genie/wlg-view",
    type: "wlg-view",
    Component: () => <WorldLineGraphViewFeature />,
  },
];

// BubbleRouteRegistryに登録
BubbleRouteRegistry.registerRoutes(tailorGenieBubbleRoutes);
