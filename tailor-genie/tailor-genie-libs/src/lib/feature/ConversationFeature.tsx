"use client";

import { FC, useState, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Speaker } from "@bublys-org/tailor-genie-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { ConversationView } from "../view/ConversationView.js";
import {
  selectConversationById,
  speak,
} from "../slice/conversation-slice.js";

export type ConversationFeatureProps = {
  speakers: Speaker[];
  conversationId: string;
};

export const ConversationFeature: FC<ConversationFeatureProps> = ({
  speakers,
  conversationId,
}) => {
  const dispatch = useDispatch();
  const { openBubble } = useContext(BubblesContext);
  const conversation = useSelector((state: any) =>
    selectConversationById(state, conversationId)
  );
  const [currentSpeakerId, setCurrentSpeakerId] = useState(speakers[0]?.id || "");

  const handleOpenSpeakerView = (speakerId: string) => {
    openBubble(`tailor-genie/conversations/${conversationId}/speakers/${speakerId}`, "root");
  };

  const handleSpeak = (message: string) => {
    if (!conversation) return;
    dispatch(
      speak({
        conversationId: conversation.id,
        speakerId: currentSpeakerId,
        message,
      })
    );
  };

  const handleSelectSpeaker = (speakerId: string) => {
    setCurrentSpeakerId(speakerId);
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
    <ConversationView
      conversation={conversation}
      speakers={speakers}
      currentSpeakerId={currentSpeakerId}
      onSelectSpeaker={handleSelectSpeaker}
      onSpeak={handleSpeak}
      onOpenSpeakerView={handleOpenSpeakerView}
    />
  );
};
