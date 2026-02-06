"use client";

import { FC } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Speaker } from "@bublys-org/tailor-genie-model";
import { SpeakerView } from "../view/SpeakerView.js";
import {
  selectConversationById,
  speak,
} from "../slice/conversation-slice.js";

// デモ用スピーカー（実際はpropsや別の方法で渡す）
const SPEAKERS: Record<string, Speaker> = {
  "speaker-1": new Speaker({ id: "speaker-1", name: "Alice" }),
  "speaker-2": new Speaker({ id: "speaker-2", name: "Bob" }),
};

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
  const speaker = SPEAKERS[speakerId];

  const handleSpeak = (message: string) => {
    if (!conversation || !speaker) return;
    dispatch(
      speak({
        conversationId: conversation.id,
        speakerId: speaker.id,
        message,
      })
    );
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

  return (
    <SpeakerView
      conversation={conversation}
      speaker={speaker}
      allSpeakers={Object.values(SPEAKERS)}
      onSpeak={handleSpeak}
    />
  );
};
