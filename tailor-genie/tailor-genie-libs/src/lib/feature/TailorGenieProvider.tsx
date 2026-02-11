"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import {
  WorldLineGraphProvider,
  useShellManager,
  useScopeManager,
  ObjectShell,
} from "@bublys-org/world-line-graph";
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

function conversationScopeId(conversationId: string): string {
  return `${CONVERSATION_SCOPE_PREFIX}${conversationId}`;
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
// Inner Provider
// ============================================================================

function TailorGenieInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Speaker: グローバルスコープ内のオブジェクト（useShellManager）
  const {
    shells: speakerShells,
    addShell: addSpeaker,
    removeShell: removeSpeaker,
  } = useShellManager<Speaker>("speaker", {
    fromJSON: (json) => Speaker.fromJSON(json as SpeakerState),
    toJSON: (s) => s.toJSON(),
    getId: (s) => s.id,
    initialObjects: DEFAULT_SPEAKERS,
  });

  // Conversation: スコープ単位の管理（useScopeManager）
  const {
    scopeIds: conversationIds,
    createScope: addConversation,
    deleteScope: deleteConversation,
  } = useScopeManager(CONVERSATION_SCOPE_PREFIX);

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
// Provider
// ============================================================================

export function TailorGenieProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorldLineGraphProvider scopeId="tailor-genie">
      <TailorGenieInner>{children}</TailorGenieInner>
    </WorldLineGraphProvider>
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

/**
 * 会話ごとの WorldLineGraphProvider を返すヘルパー
 */
export function ConversationWorldLineProvider({
  conversationId,
  children,
}: {
  conversationId: string;
  children: React.ReactNode;
}) {
  return (
    <WorldLineGraphProvider scopeId={conversationScopeId(conversationId)}>
      {children}
    </WorldLineGraphProvider>
  );
}

// ============================================================================
// Conversation shell — ConversationWorldLineProvider の内側で使用
// ============================================================================

const CONVERSATION_SHELL_CONFIG = {
  fromJSON: (json: unknown) =>
    Conversation.fromJSON(json as SerializedConversationState),
  toJSON: (c: Conversation) => c.toJSON(),
  getId: (c: Conversation) => c.id,
} as const;

/**
 * 会話スコープ内で Conversation shell を取得するフック。
 * ConversationWorldLineProvider の内側で使用すること。
 */
export function useConversationShell(
  conversationId: string
): ObjectShell<Conversation> | null {
  const initialObjects = useMemo(
    () => [new Conversation({ id: conversationId, participantIds: [], turns: [] })],
    [conversationId]
  );

  const { shells } = useShellManager<Conversation>("conversation", {
    ...CONVERSATION_SHELL_CONFIG,
    initialObjects,
  });

  return shells.find((s) => s.id === conversationId) ?? null;
}
