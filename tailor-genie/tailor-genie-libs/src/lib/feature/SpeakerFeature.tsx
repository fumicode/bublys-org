"use client";

import { FC } from "react";
import { SpeakerView } from "../view/SpeakerView.js";
import {
  useTailorGenie,
  ConversationWorldLineProvider,
  useConversationShell,
} from "./TailorGenieProvider.js";

export type SpeakerFeatureProps = {
  conversationId: string;
  speakerId: string;
};

export const SpeakerFeature: FC<SpeakerFeatureProps> = ({
  conversationId,
  speakerId,
}) => {
  return (
    <ConversationWorldLineProvider conversationId={conversationId}>
      <SpeakerFeatureInner
        conversationId={conversationId}
        speakerId={speakerId}
      />
    </ConversationWorldLineProvider>
  );
};

const SpeakerFeatureInner: FC<SpeakerFeatureProps> = ({
  conversationId,
  speakerId,
}) => {
  const { speakerShells } = useTailorGenie();
  const conversationShell = useConversationShell(conversationId);
  const conversation = conversationShell?.object ?? null;

  const speaker =
    speakerShells.find((s) => s.id === speakerId)?.object ?? null;
  const participants = conversation
    ? speakerShells
        .map((s) => s.object)
        .filter((s) => conversation.hasParticipant(s.id))
    : [];

  const handleSpeak = (message: string) => {
    if (!conversationShell || !speaker) return;
    conversationShell.update((c) => c.speak(speaker, message));
  };

  if (!speaker) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スピーカーが見つかりません: {speakerId}
      </div>
    );
  }

  if (!conversation) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        会話が見つかりません
      </div>
    );
  }

  const isParticipant = conversation.hasParticipant(speakerId);

  return (
    <SpeakerView
      conversation={conversation}
      speaker={speaker}
      allSpeakers={participants}
      onSpeak={isParticipant ? handleSpeak : undefined}
    />
  );
};
