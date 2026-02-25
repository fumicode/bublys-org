"use client";

import { FC, useMemo } from "react";
import { Conversation, type Turn, type Choice } from "@bublys-org/tailor-genie-model";
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

  const conversationStateRefHash = useMemo(() => {
    const refs = scope.graph.getCurrentStateRefs();
    return refs.find((r) => r.type === "conversation" && r.id === conversationId)?.hash ?? null;
  }, [scope.graph, conversationId]);

  const forkChoices = scope.getForkChoices();

  const childNodeIds = useMemo(() => {
    if (!conversation?.pendingQuestion) return null;
    const ids = scope.graph.getApexChildIds();
    return ids.length > 0 ? ids : null;
  }, [conversation, scope.graph]);

  const forkPreviews = useMemo((): ForkPreview<Turn[]>[] => {
    if (!conversation) return [];

    const nodeIds = childNodeIds ?? forkChoices.map((c) => c.nodeId);
    if (nodeIds.length === 0) return [];

    return nodeIds.flatMap((nodeId) => {
      const conv = scope.getObjectAt<Conversation>(nodeId, "conversation", conversationId);
      if (!conv) return [];
      const newTurns = conv.turns.slice(conversation.turns.length);
      if (newTurns.length === 0) return [];
      return [{
        nodeId,
        isSameLine: forkChoices.find((c) => c.nodeId === nodeId)?.isSameLine ?? true,
        preview: newTurns,
        onSelect: () => scope.moveTo(nodeId),
      }];
    });
  }, [forkChoices, childNodeIds, conversation, conversationId, scope]);

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

  const handleAskQuestion = (question: string, choices: Choice[]) => {
    if (!conversationShell || !speaker) return;
    conversationShell.update((c) => c.askQuestion(speaker, question, choices));
  };

  const handleAnswerQuestion = (choiceId: string) => {
    if (!conversationShell || !speaker) return;
    conversationShell.update((c) => c.answerQuestion(speaker, choiceId));
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
      onAskQuestion={isParticipant && speaker.isHost ? handleAskQuestion : undefined}
      onAnswerQuestion={isParticipant && speaker.isGuest ? handleAnswerQuestion : undefined}
      wlNav={wlNav}
      stateRefHash={conversationStateRefHash}
    />
  );
};
