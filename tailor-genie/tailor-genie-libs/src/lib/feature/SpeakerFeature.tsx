"use client";

import { FC } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SpeakerView } from "../view/SpeakerView.js";
import {
  selectConversationById,
  selectParticipants,
  selectSpeakerById,
  saveConversation,
} from "../slice/conversation-slice.js";

export type SpeakerFeatureProps = {
  conversationId: string;
  speakerId: string;
};

export const SpeakerFeature: FC<SpeakerFeatureProps> = ({
  conversationId,
  speakerId,
}) => {
  const dispatch = useDispatch();
  const conversation = useSelector((state: any) =>
    selectConversationById(state, conversationId)
  );
  const speaker = useSelector((state: any) =>
    selectSpeakerById(state, speakerId)
  );
  const participants = useSelector((state: any) =>
    selectParticipants(state, conversationId)
  );

  const handleSpeak = (message: string) => {
    if (!conversation || !speaker) return;
    // ドメインオブジェクトのメソッドを使用
    const updated = conversation.speak(speaker, message);
    dispatch(saveConversation(updated.state));
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

  // このスピーカーが参加者かどうか
  const isParticipant = conversation.hasParticipant(speakerId);

  return (
    <SpeakerView
      conversation={conversation}
      speaker={speaker}
      allSpeakers={participants}
      onSpeak={isParticipant ? handleSpeak : undefined}
    />
  );
};
