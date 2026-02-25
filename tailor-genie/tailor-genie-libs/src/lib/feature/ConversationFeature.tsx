"use client";

import { FC, useState, useContext, useEffect, useMemo } from "react";
import { Conversation, type Turn } from "@bublys-org/tailor-genie-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useCasScope, type WlNavProps, type ForkPreview } from "@bublys-org/world-line-graph";
import { ConversationView } from "../view/ConversationView.js";
import { useTailorGenie, conversationScopeId } from "./TailorGenieProvider.js";

export type ConversationFeatureProps = {
  conversationId: string;
};

export const ConversationFeature: FC<ConversationFeatureProps> = ({
  conversationId,
}) => {
  const { openBubble } = useContext(BubblesContext);
  const { speakerShells } = useTailorGenie();
  const scope = useCasScope(conversationScopeId(conversationId), {
    initialObjects: [
      {
        type: "conversation",
        object: new Conversation({ id: conversationId, participantIds: [], turns: [] }),
      },
    ],
  });

  const conversationShell = scope.getShell<Conversation>("conversation", conversationId);
  const conversation = conversationShell?.object ?? null;

  const participants = useMemo(
    () =>
      conversation
        ? speakerShells
            .map((s) => s.object)
            .filter((s) => conversation.hasParticipant(s.id))
        : [],
    [conversation, speakerShells]
  );

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

  const forkChoices = scope.getForkChoices();

  const forkPreviews = useMemo((): ForkPreview<Turn[]>[] => {
    if (!conversation || forkChoices.length === 0) return [];

    return forkChoices.flatMap((choice) => {
      const conv = scope.getObjectAt<Conversation>(choice.nodeId, "conversation", conversationId);
      if (!conv) return [];
      const newTurns = conv.turns
        .slice(conversation.turns.length);
      if (newTurns.length === 0) return [];
      return [{
        nodeId: choice.nodeId,
        isSameLine: choice.isSameLine,
        preview: newTurns,
        onSelect: () => scope.moveTo(choice.nodeId),
      }];
    });
  }, [forkChoices, conversation, conversationId, scope]);

  const wlNav = useMemo((): WlNavProps<Turn[]> => ({
    onUndo: scope.moveBack,
    onRedo: scope.moveForward,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
    forkPreviews,
  }), [scope.moveBack, scope.moveForward, scope.canUndo, scope.canRedo, forkPreviews]);

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
    <ConversationView
      conversation={conversation}
      participants={participants}
      currentSpeakerId={currentSpeakerId}
      onSelectSpeaker={handleSelectSpeaker}
      onSpeak={handleSpeak}
      onOpenSpeakerView={handleOpenSpeakerView}
      onAddParticipant={handleAddParticipant}
      wlNav={wlNav}
    />
  );
};
