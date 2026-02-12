"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import {
  CasProvider,
  useCasScope,
  ObjectShell,
  createScope as createScopeAction,
  deleteScope as deleteScopeAction,
  type CasRegistry,
} from "@bublys-org/world-line-graph";
import { useAppDispatch } from "@bublys-org/state-management";
import {
  Speaker,
  type SpeakerState,
  Conversation,
  type SerializedConversationState,
} from "@bublys-org/tailor-genie-model";

// ============================================================================
// Default Speakers
// ============================================================================

const DEFAULT_SPEAKERS: Speaker[] = [
  new Speaker({ id: "speaker-1", name: "ジーニー", role: "host" }),
  new Speaker({ id: "speaker-2", name: "坂口様", role: "guest" }),
];

// ============================================================================
// Conversation scope prefix
// ============================================================================

const CONVERSATION_SCOPE_PREFIX = "conversation-";

export function conversationScopeId(conversationId: string): string {
  return `${CONVERSATION_SCOPE_PREFIX}${conversationId}`;
}

// ============================================================================
// CAS Registry — 全型のシリアライズ/デシリアライズ設定
// ============================================================================

const TAILOR_GENIE_REGISTRY: CasRegistry = {
  speaker: {
    fromJSON: (json) => Speaker.fromJSON(json as SpeakerState),
    toJSON: (s: Speaker) => s.toJSON(),
    getId: (s: Speaker) => s.id,
  },
  conversation: {
    fromJSON: (json) => Conversation.fromJSON(json as SerializedConversationState),
    toJSON: (c: Conversation) => c.toJSON(),
    getId: (c: Conversation) => c.id,
  },
  "conversation-meta": {
    fromJSON: (json) => json as ConversationMeta,
    toJSON: (obj: ConversationMeta) => obj,
    getId: (obj: ConversationMeta) => obj.id,
  },
};

// ============================================================================
// Conversation meta — グローバルWLGで「会話の存在」を管理するための型
// ============================================================================

interface ConversationMeta {
  id: string;
}

// ============================================================================
// Context — 内部実装。公開 API はフック経由
// ============================================================================

interface TailorGenieContextValue {
  // Speaker
  speakerShells: ObjectShell<Speaker>[];
  addSpeaker: (speaker: Speaker) => void;
  removeSpeaker: (id: string) => void;
  // Conversation
  conversationIds: string[];
  addConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  // Navigation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const TailorGenieContext =
  createContext<TailorGenieContextValue | null>(null);

// ============================================================================
// Inner Provider — CasProvider の内側で動作
// ============================================================================

function TailorGenieInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // グローバルスコープ: Speaker と ConversationMeta を管理
  const scope = useCasScope("tailor-genie", {
    initialObjects: DEFAULT_SPEAKERS.map((s) => ({ type: "speaker", object: s })),
  });

  const speakerShells = scope.shells<Speaker>("speaker");
  const conversationMetaShells = scope.shells<ConversationMeta>("conversation-meta");

  const addSpeaker = useCallback(
    (speaker: Speaker) => scope.addObject("speaker", speaker),
    [scope]
  );

  const removeSpeaker = useCallback(
    (id: string) => scope.removeObject("speaker", id),
    [scope]
  );

  const conversationIds = useMemo(
    () => conversationMetaShells.map((s) => s.id),
    [conversationMetaShells]
  );

  // 会話作成: グローバルWLGに ref を追加 + ローカルWLGスコープを作成
  const addConversation = useCallback(
    (id: string) => {
      scope.addObject("conversation-meta", { id });
      dispatch(createScopeAction(conversationScopeId(id)));
    },
    [scope, dispatch]
  );

  // 会話削除: グローバルWLGから ref を tombstone + ローカルWLGスコープを削除
  const deleteConversation = useCallback(
    (id: string) => {
      scope.removeObject("conversation-meta", id);
      dispatch(deleteScopeAction(conversationScopeId(id)));
    },
    [scope, dispatch]
  );

  const value = useMemo<TailorGenieContextValue>(
    () => ({
      speakerShells,
      addSpeaker,
      removeSpeaker,
      conversationIds,
      addConversation,
      deleteConversation,
      activeConversationId,
      setActiveConversationId,
    }),
    [
      speakerShells,
      addSpeaker,
      removeSpeaker,
      conversationIds,
      addConversation,
      deleteConversation,
      activeConversationId,
    ]
  );

  return (
    <TailorGenieContext.Provider value={value}>
      {children}
    </TailorGenieContext.Provider>
  );
}

// ============================================================================
// Provider — CasProvider でラップ
// ============================================================================

export function TailorGenieProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CasProvider registry={TAILOR_GENIE_REGISTRY}>
      <TailorGenieInner>{children}</TailorGenieInner>
    </CasProvider>
  );
}

// ============================================================================
// Hooks — 公開 API
// ============================================================================

function useContextValue(): TailorGenieContextValue {
  const context = useContext(TailorGenieContext);
  if (!context) {
    throw new Error(
      "useTailorGenie must be used within a TailorGenieProvider"
    );
  }
  return context;
}

/**
 * Tailor Genie アプリのグローバル状態
 */
export function useTailorGenie(): TailorGenieContextValue {
  return useContextValue();
}
