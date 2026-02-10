import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Conversation,
  ConversationState,
  Turn,
  TurnState,
  Speaker,
  SpeakerState,
} from "@bublys-org/tailor-genie-model";

/**
 * Redux用のシリアライズ可能な状態
 */
type SerializedConversationState = {
  id: string;
  participantIds: string[];
  turns: TurnState[];
};

type ConversationsSliceState = {
  speakers: Record<string, SpeakerState>;
  conversations: Record<string, SerializedConversationState>;
  activeConversationId: string | null;
};

const DEFAULT_SPEAKERS: SpeakerState[] = [
  { id: "speaker-1", name: "ジーニー", role: "host" },
  { id: "speaker-2", name: "坂口様", role: "guest" },
];

const initialState: ConversationsSliceState = {
  speakers: Object.fromEntries(DEFAULT_SPEAKERS.map((s) => [s.id, s])),
  conversations: {},
  activeConversationId: null,
};

/**
 * ドメインモデルをシリアライズ
 */
export const serializeConversation = (
  conversation: Conversation
): SerializedConversationState => ({
  id: conversation.id,
  participantIds: conversation.participantIds,
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
    participantIds: state.participantIds || [],
    turns: state.turns.map((t) => new Turn(t)),
  });
};

/**
 * SpeakerStateからSpeakerドメインモデルを復元
 */
export const deserializeSpeaker = (state: SpeakerState): Speaker => {
  return new Speaker(state);
};

/**
 * Sliceはリポジトリとして機能し、集約のCRUD操作のみを提供する
 * ビジネスロジックはドメインオブジェクトが担当する
 */
const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    // Conversation CRUD
    saveConversation: (state, action: PayloadAction<ConversationState>) => {
      const conversation = new Conversation(action.payload);
      state.conversations[conversation.id] = serializeConversation(conversation);
    },

    deleteConversation: (state, action: PayloadAction<string>) => {
      delete state.conversations[action.payload];
      if (state.activeConversationId === action.payload) {
        const ids = Object.keys(state.conversations);
        state.activeConversationId = ids.length > 0 ? ids[0] : null;
      }
    },

    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
    },

    // Speaker CRUD
    saveSpeaker: (state, action: PayloadAction<SpeakerState>) => {
      state.speakers[action.payload.id] = action.payload;
    },

    deleteSpeaker: (state, action: PayloadAction<string>) => {
      delete state.speakers[action.payload];
    },
  },
});

export const {
  saveConversation,
  deleteConversation,
  setActiveConversation,
  saveSpeaker,
  deleteSpeaker,
} = conversationsSlice.actions;

export const conversationsReducer = conversationsSlice.reducer;
export { conversationsSlice };

// Selectors（stateは常に正規化されているため、undefinedチェック不要）
export const selectSpeakers = (state: {
  conversations: ConversationsSliceState;
}): Speaker[] => {
  return Object.values(state.conversations.speakers).map(deserializeSpeaker);
};

export const selectSpeakerById = (
  state: { conversations: ConversationsSliceState },
  speakerId: string
): Speaker | null => {
  const speakerState = state.conversations.speakers[speakerId];
  if (!speakerState) return null;
  return deserializeSpeaker(speakerState);
};

export const selectConversations = (state: {
  conversations: ConversationsSliceState;
}): Conversation[] => {
  return Object.values(state.conversations.conversations).map(deserializeConversation);
};

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

export const selectParticipants = (
  state: { conversations: ConversationsSliceState },
  conversationId: string
): Speaker[] => {
  const serialized = state.conversations.conversations[conversationId];
  if (!serialized) return [];
  const participantIds = serialized.participantIds || [];
  return participantIds
    .map((id) => state.conversations.speakers[id])
    .filter((s): s is SpeakerState => s !== undefined)
    .map(deserializeSpeaker);
};
