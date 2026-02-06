// Slice
export {
  conversationsSlice,
  conversationsReducer,
  createConversation,
  setActiveConversation,
  speak,
  removeTurn,
  updateTurn,
  deleteConversation,
  selectConversations,
  selectActiveConversationId,
  selectActiveConversation,
  selectConversationById,
  deserializeConversation,
} from "./lib/slice/conversation-slice.js";

// Bubble Routes (このファイルをimportすると自動登録される)
import "./lib/registration/bubbleRoutes.js";
export { tailorGenieBubbleRoutes } from "./lib/registration/bubbleRoutes.js";

// View
export { TurnView } from "./lib/view/TurnView.js";
export type { TurnViewProps } from "./lib/view/TurnView.js";
export { ConversationView } from "./lib/view/ConversationView.js";
export type { ConversationViewProps } from "./lib/view/ConversationView.js";

// Feature
export { ConversationFeature } from "./lib/feature/ConversationFeature.js";
export type { ConversationFeatureProps } from "./lib/feature/ConversationFeature.js";
export { ConversationListFeature } from "./lib/feature/ConversationListFeature.js";
