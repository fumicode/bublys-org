"use client";

import { FC, useState, useContext, useEffect, useMemo } from "react";
import { Turn, SerializedConversationState } from "@bublys-org/tailor-genie-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useWorldLineGraph } from "@bublys-org/world-line-graph";
import { ConversationView } from "../view/ConversationView.js";
import type { BranchPreview } from "../view/GhostTurnsView.js";
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
      branchPreviews={branchPreviews}
      onUndo={moveBack}
      onRedo={moveForward}
      canUndo={canUndo}
      canRedo={canRedo}
    />
  );
};
