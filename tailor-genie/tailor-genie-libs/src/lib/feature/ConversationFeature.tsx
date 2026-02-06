"use client";

import { FC, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User } from "@bublys-org/tailor-genie-model";
import { ConversationView } from "../view/ConversationView.js";
import {
  selectConversationById,
  speak,
  removeTurn,
} from "../slice/conversation-slice.js";

export type ConversationFeatureProps = {
  users: User[];
  conversationId: string;
};

export const ConversationFeature: FC<ConversationFeatureProps> = ({
  users,
  conversationId,
}) => {
  const dispatch = useDispatch();
  const conversation = useSelector((state: any) =>
    selectConversationById(state, conversationId)
  );
  const [currentUserId, setCurrentUserId] = useState(users[0]?.id || "");

  const handleSpeak = (message: string) => {
    if (!conversation) return;
    dispatch(
      speak({
        conversationId: conversation.id,
        userId: currentUserId,
        message,
      })
    );
  };

  const handleDeleteTurn = (turnId: string) => {
    if (!conversation) return;
    dispatch(
      removeTurn({
        conversationId: conversation.id,
        turnId,
      })
    );
  };

  const handleSelectUser = (userId: string) => {
    setCurrentUserId(userId);
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
      users={users}
      currentUserId={currentUserId}
      onSelectUser={handleSelectUser}
      onSpeak={handleSpeak}
      onDeleteTurn={handleDeleteTurn}
    />
  );
};
