import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Conversation,
  Turn,
  TurnState,
  Speaker,
} from "@bublys-org/tailor-genie-model";

/**
 * Redux用のシリアライズ可能な状態
 */
type SerializedConversationState = {
  id: string;
  turns: TurnState[];
};

type ConversationsSliceState = {
  conversations: Record<string, SerializedConversationState>;
  activeConversationId: string | null;
};

const initialState: ConversationsSliceState = {
  conversations: {},
  activeConversationId: null,
};

/**
 * ドメインモデルをシリアライズ
 */
const serializeConversation = (
  conversation: Conversation
): SerializedConversationState => ({
  id: conversation.id,
  turns: conversation.turns.map((t) => t.state),
});

/**
 * シリアライズされた状態からドメインモデルを復元
 */
export const deserializeConversation = (
  state: SerializedConversationState
): Conversation => {
  return new Conversation({
    id: state.id,
    turns: state.turns.map((t) => new Turn(t)),
  });
};

const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    createConversation: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      const conversation = new Conversation({ id, turns: [] });
      state.conversations[id] = serializeConversation(conversation);
      state.activeConversationId = id;
    },

    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
    },

    speak: (
      state,
      action: PayloadAction<{
        conversationId: string;
        speakerId: string;
        message: string;
      }>
    ) => {
      const { conversationId, speakerId, message } = action.payload;
      const serialized = state.conversations[conversationId];
      if (!serialized) return;

      const conversation = deserializeConversation(serialized);
      const speaker = new Speaker({ id: speakerId, name: "" });
      const updated = conversation.speak(speaker, message);
      state.conversations[conversationId] = serializeConversation(updated);
    },

    updateTurn: (
      state,
      action: PayloadAction<{
        conversationId: string;
        turnId: string;
        message: string;
      }>
    ) => {
      const { conversationId, turnId, message } = action.payload;
      const serialized = state.conversations[conversationId];
      if (!serialized) return;

      const conversation = deserializeConversation(serialized);
      const updated = conversation.updateTurn(turnId, message);
      state.conversations[conversationId] = serializeConversation(updated);
    },

    deleteConversation: (state, action: PayloadAction<string>) => {
      delete state.conversations[action.payload];
      if (state.activeConversationId === action.payload) {
        const ids = Object.keys(state.conversations);
        state.activeConversationId = ids.length > 0 ? ids[0] : null;
      }
    },
  },
});

export const {
  createConversation,
  setActiveConversation,
  speak,
  updateTurn,
  deleteConversation,
} = conversationsSlice.actions;

export const conversationsReducer = conversationsSlice.reducer;
export { conversationsSlice };

// Selectors
export const selectConversations = (state: {
  conversations: ConversationsSliceState;
}) => state.conversations.conversations;

export const selectActiveConversationId = (state: {
  conversations: ConversationsSliceState;
}) => state.conversations.activeConversationId;

export const selectActiveConversation = (state: {
  conversations: ConversationsSliceState;
}): Conversation | null => {
  const { activeConversationId, conversations } = state.conversations;
  if (!activeConversationId) return null;
  const serialized = conversations[activeConversationId];
  if (!serialized) return null;
  return deserializeConversation(serialized);
};

export const selectConversationById = (
  state: { conversations: ConversationsSliceState },
  conversationId: string
): Conversation | null => {
  const serialized = state.conversations.conversations[conversationId];
  if (!serialized) return null;
  return deserializeConversation(serialized);
};
