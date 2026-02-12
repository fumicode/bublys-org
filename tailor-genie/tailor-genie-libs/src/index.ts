// Bubble Routes (このファイルをimportすると自動登録される)
import "./lib/registration/bubbleRoutes.js";
export { tailorGenieBubbleRoutes } from "./lib/registration/bubbleRoutes.js";

// View
export { TurnView } from "./lib/view/TurnView.js";
export type { TurnViewProps } from "./lib/view/TurnView.js";
export { ConversationView } from "./lib/view/ConversationView.js";
export type { ConversationViewProps } from "./lib/view/ConversationView.js";
export { SpeakerView } from "./lib/view/SpeakerView.js";
export type { SpeakerViewProps } from "./lib/view/SpeakerView.js";
export { SpeakerDetailView } from "./lib/view/SpeakerDetailView.js";
export type { SpeakerDetailViewProps } from "./lib/view/SpeakerDetailView.js";

// Feature
export { ConversationFeature } from "./lib/feature/ConversationFeature.js";
export type { ConversationFeatureProps } from "./lib/feature/ConversationFeature.js";
export { ConversationListFeature } from "./lib/feature/ConversationListFeature.js";
export { SpeakerFeature } from "./lib/feature/SpeakerFeature.js";
export type { SpeakerFeatureProps } from "./lib/feature/SpeakerFeature.js";
export { SpeakerListFeature } from "./lib/feature/SpeakerListFeature.js";
export { SpeakerDetailFeature } from "./lib/feature/SpeakerDetailFeature.js";
export type { SpeakerDetailFeatureProps } from "./lib/feature/SpeakerDetailFeature.js";

// Provider
export { TailorGenieProvider, useTailorGenie, conversationScopeId } from "./lib/feature/TailorGenieProvider.js";
