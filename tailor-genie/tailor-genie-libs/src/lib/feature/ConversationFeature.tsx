"use client";

import { FC, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User } from "@bublys-org/tailor-genie-model";
import { ConversationView } from "../view/ConversationView.js";
import {
  selectActiveConversation,
  speak,
  removeTurn,
  createConversation,
} from "../slice/conversation-slice.js";

export type ConversationFeatureProps = {
  users: User[];
};

export const ConversationFeature: FC<ConversationFeatureProps> = ({
  users,
}) => {
  const dispatch = useDispatch();
  const conversation = useSelector(selectActiveConversation);
  const [currentUserId, setCurrentUserId] = useState(users[0]?.id || "");

  const handleCreateConversation = () => {
    dispatch(createConversation());
  };

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
          gap: 16,
        }}
      >
        <p style={{ color: "#666" }}>会話がありません</p>
        <p style={{ color: "#999", fontSize: 12 }}>
          参加者: {users.map((u) => u.name).join(", ")}
        </p>
        <button
          onClick={handleCreateConversation}
          style={{
            padding: "12px 24px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          新しい会話を始める
        </button>
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
