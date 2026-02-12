"use client";

import { FC, useMemo } from "react";
import { Turn, SerializedConversationState } from "@bublys-org/tailor-genie-model";
import { useWorldLineGraph } from "@bublys-org/world-line-graph";
import { SpeakerView } from "../view/SpeakerView.js";
import type { BranchPreview } from "../view/GhostTurnsView.js";
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

  const apexNode = graph.state.apexNodeId
    ? graph.state.nodes[graph.state.apexNodeId]
    : null;
  const canUndo =
    apexNode?.parentId !== null && apexNode?.parentId !== undefined;
  const childrenMap = graph.getChildrenMap();
  const childIds = apexNode ? (childrenMap[apexNode.id] ?? []) : [];
  const canRedo = childIds.length > 0;

  const branchPreviews = useMemo((): BranchPreview[] => {
    if (!conversation || !apexNode || childIds.length <= 1) return [];

    return childIds.flatMap((childId) => {
      const childNode = graph.state.nodes[childId];
      const convRef = childNode.changedRefs.find(
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
        childId,
        isSameLine: childNode.worldLineId === apexNode.worldLineId,
        newTurns,
        onSelect: () => moveTo(childId),
      }];
    });
  }, [graph, conversation, conversationId, apexNode, childIds, getLoadedState, moveTo]);

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
      branchPreviews={branchPreviews}
      onUndo={moveBack}
      onRedo={moveForward}
      canUndo={canUndo}
      canRedo={canRedo}
    />
  );
};
