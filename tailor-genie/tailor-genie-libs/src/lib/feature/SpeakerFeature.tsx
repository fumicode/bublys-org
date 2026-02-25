"use client";

import { FC, useMemo } from "react";
import { Conversation, type Turn } from "@bublys-org/tailor-genie-model";
import { useCasScope, type WlNavProps, type ForkPreview } from "@bublys-org/world-line-graph";
import { SpeakerView } from "../view/SpeakerView.js";
import { useTailorGenie, conversationScopeId } from "./TailorGenieProvider.js";

export type SpeakerFeatureProps = {
  conversationId: string;
  speakerId: string;
};

export const SpeakerFeature: FC<SpeakerFeatureProps> = ({
  conversationId,
  speakerId,
}) => {
  const { speakerShells } = useTailorGenie();
  const scope = useCasScope(conversationScopeId(conversationId));

  const conversationShell = scope.getShell<Conversation>("conversation", conversationId);
  const conversation = conversationShell?.object ?? null;

  const speaker =
    speakerShells.find((s) => s.id === speakerId)?.object ?? null;
  const participants = conversation
    ? speakerShells
        .map((s) => s.object)
        .filter((s) => conversation.hasParticipant(s.id))
    : [];

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
