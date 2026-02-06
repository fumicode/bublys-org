"use client";

import { FC, useState, useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { ConversationView } from "../view/ConversationView.js";
import {
  selectConversationById,
  selectParticipants,
  selectSpeakerById,
  saveConversation,
} from "../slice/conversation-slice.js";

export type ConversationFeatureProps = {
  conversationId: string;
};

export const ConversationFeature: FC<ConversationFeatureProps> = ({
  conversationId,
}) => {
  const dispatch = useDispatch();
  const { openBubble } = useContext(BubblesContext);
  const conversation = useSelector((state: any) =>
    selectConversationById(state, conversationId)
  );
  const participants = useSelector((state: any) =>
    selectParticipants(state, conversationId)
  );
  const [currentSpeakerId, setCurrentSpeakerId] = useState("");

  // 現在選択中のスピーカーを取得
  const currentSpeaker = useSelector((state: any) =>
    selectSpeakerById(state, currentSpeakerId)
  );

  useEffect(() => {
    if (participants.length > 0 && !currentSpeakerId) {
      setCurrentSpeakerId(participants[0].id);
    }
  }, [participants, currentSpeakerId]);

  const handleOpenSpeakerView = (speakerId: string) => {
    openBubble(`tailor-genie/conversations/${conversationId}/speakers/${speakerId}`, "root");
  };

  const handleSpeak = (message: string) => {
    if (!conversation || !currentSpeaker) return;
    // ドメインオブジェクトのメソッドを使用
    const updated = conversation.speak(currentSpeaker, message);
    dispatch(saveConversation(updated.state));
  };

  const handleSelectSpeaker = (speakerId: string) => {
    setCurrentSpeakerId(speakerId);
  };

  const handleAddParticipant = (speakerId: string) => {
    if (!conversation) return;
    // ドメインオブジェクトのメソッドを使用（既に参加している場合は内部で弾かれる）
    const updated = conversation.addParticipant(speakerId);
    dispatch(saveConversation(updated.state));
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
      participants={participants}
      currentSpeakerId={currentSpeakerId}
      onSelectSpeaker={handleSelectSpeaker}
      onSpeak={handleSpeak}
      onOpenSpeakerView={handleOpenSpeakerView}
      onAddParticipant={handleAddParticipant}
    />
  );
};
