"use client";

import { FC, useState, useContext, useEffect } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { ConversationView } from "../view/ConversationView.js";
import {
  useTailorGenie,
  ConversationWorldLineProvider,
  useConversationShell,
} from "./TailorGenieProvider.js";
import { WorldLineControlFeature } from "./WorldLineControlFeature.js";

export type ConversationFeatureProps = {
  conversationId: string;
};

export const ConversationFeature: FC<ConversationFeatureProps> = ({
  conversationId,
}) => {
  return (
    <ConversationWorldLineProvider conversationId={conversationId}>
      <ConversationFeatureInner conversationId={conversationId} />
    </ConversationWorldLineProvider>
  );
};

const ConversationFeatureInner: FC<ConversationFeatureProps> = ({
  conversationId,
}) => {
  const { openBubble } = useContext(BubblesContext);
  const { speakerShells } = useTailorGenie();
  const conversationShell = useConversationShell(conversationId);
  const conversation = conversationShell?.object ?? null;

  const participants = conversation
    ? speakerShells
        .map((s) => s.object)
        .filter((s) => conversation.hasParticipant(s.id))
    : [];

  const [currentSpeakerId, setCurrentSpeakerId] = useState("");

  const currentSpeaker =
    speakerShells.find((s) => s.id === currentSpeakerId)?.object ?? null;

  useEffect(() => {
    if (participants.length > 0 && !currentSpeakerId) {
      setCurrentSpeakerId(participants[0].id);
    }
  }, [participants, currentSpeakerId]);

  const handleOpenSpeakerView = (speakerId: string) => {
    openBubble(
      `tailor-genie/conversations/${conversationId}/speakers/${speakerId}`,
      "root"
    );
  };

  const handleSpeak = (message: string) => {
    if (!conversationShell || !currentSpeaker) return;
    conversationShell.update((c) => c.speak(currentSpeaker, message));
  };

  const handleSelectSpeaker = (speakerId: string) => {
    setCurrentSpeakerId(speakerId);
  };

  const handleAddParticipant = (speakerId: string) => {
    if (!conversationShell) return;
    conversationShell.update((c) => c.addParticipant(speakerId));
  };

  if (!conversation) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#666",
        }}
      >
        会話が見つかりません
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <WorldLineControlFeature />
      <ConversationView
        conversation={conversation}
        participants={participants}
        currentSpeakerId={currentSpeakerId}
        onSelectSpeaker={handleSelectSpeaker}
        onSpeak={handleSpeak}
        onOpenSpeakerView={handleOpenSpeakerView}
        onAddParticipant={handleAddParticipant}
      />
    </div>
  );
};
