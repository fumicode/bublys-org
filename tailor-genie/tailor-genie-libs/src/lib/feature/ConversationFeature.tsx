"use client";

import { FC, useState, useContext, useEffect, useMemo } from "react";
import { Turn, SerializedConversationState } from "@bublys-org/tailor-genie-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useWorldLineGraph, type WlNavProps, type ForkPreview } from "@bublys-org/world-line-graph";
import { ConversationView } from "../view/ConversationView.js";
import {
  useTailorGenie,
  ConversationWorldLineProvider,
  useConversationShell,
} from "./TailorGenieProvider.js";

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
  const { graph, moveBack, moveForward, moveTo, getLoadedState } =
    useWorldLineGraph();

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

  const forkChoices = graph.getForkChoices();

  const forkPreviews = useMemo((): ForkPreview<Turn[]>[] => {
    if (!conversation || forkChoices.length === 0) return [];

    return forkChoices.flatMap((choice) => {
      const convRef = choice.changedRefs.find(
        (r) => r.type === "conversation" && r.id === conversationId
      );
      if (!convRef) return [];
      const convData = getLoadedState<SerializedConversationState>(convRef.hash);
      if (!convData) return [];
      const newTurns = convData.turns
        .slice(conversation.turns.length)
        .map((t) => new Turn(t));
      if (newTurns.length === 0) return [];
      return [{
        nodeId: choice.nodeId,
        isSameLine: choice.isSameLine,
        preview: newTurns,
        onSelect: () => moveTo(choice.nodeId),
      }];
    });
  }, [forkChoices, conversation, conversationId, getLoadedState, moveTo]);

  const wlNav = useMemo((): WlNavProps<Turn[]> => ({
    onUndo: moveBack,
    onRedo: moveForward,
    canUndo: graph.canUndo,
    canRedo: graph.canRedo,
    forkPreviews,
  }), [moveBack, moveForward, graph.canUndo, graph.canRedo, forkPreviews]);

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
