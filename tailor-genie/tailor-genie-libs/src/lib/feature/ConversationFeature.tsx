"use client";

import { FC, useContext, useMemo } from "react";
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

  const handleOpenSpeakerView = (speakerId: string) => {
    openBubble(
      `tailor-genie/conversations/${conversationId}/speakers/${speakerId}`,
      "root"
    );
  };

  const handleAddParticipant = (speakerId: string) => {
    if (!conversationShell) return;
    conversationShell.update((c) => c.addParticipant(speakerId));
  };

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
      onOpenSpeakerView={handleOpenSpeakerView}
      onAddParticipant={handleAddParticipant}
      wlNav={wlNav}
    />
  );
};
