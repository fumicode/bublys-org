"use client";

import { FC, useMemo } from "react";
import { Turn, SerializedConversationState } from "@bublys-org/tailor-genie-model";
import { useWorldLineGraph, type WlNavProps, type ForkPreview } from "@bublys-org/world-line-graph";
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
  const { graph, moveBack, moveForward, moveTo, getLoadedState } =
    useWorldLineGraph();

  const speaker =
    speakerShells.find((s) => s.id === speakerId)?.object ?? null;
  const participants = conversation
    ? speakerShells
        .map((s) => s.object)
        .filter((s) => conversation.hasParticipant(s.id))
    : [];

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
      wlNav={wlNav}
    />
  );
};
