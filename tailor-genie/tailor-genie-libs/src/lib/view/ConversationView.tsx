"use client";

import { FC, useState, FormEvent, ChangeEvent } from "react";
import { Conversation, User } from "@bublys-org/tailor-genie-model";
import { TurnView } from "./TurnView.js";

export type ConversationViewProps = {
  conversation: Conversation;
  users: User[];
  currentUserId: string;
  onSelectUser?: (userId: string) => void;
  onSpeak?: (message: string) => void;
  onDeleteTurn?: (turnId: string) => void;
};

export const ConversationView: FC<ConversationViewProps> = ({
  conversation,
  users,
  currentUserId,
  onSelectUser,
  onSpeak,
  onDeleteTurn,
}) => {
  const [message, setMessage] = useState("");

  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user?.name || userId;
  };

  const currentUser = users.find((u) => u.id === currentUserId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSpeak) {
      onSpeak(message.trim());
      setMessage("");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #ddd",
          background: "#f5f5f5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: "bold" }}>
          会話 #{conversation.id.slice(0, 8)}
        </span>
        <span style={{ fontSize: 12, color: "#666" }}>
          参加者: {users.map((u) => u.name).join(", ")}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {conversation.turns.length === 0 ? (
          <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
            まだ発言がありません
          </div>
        ) : (
          conversation.turns.map((turn) => (
            <TurnView
              key={turn.id}
              turn={turn}
              userName={getUserName(turn.userId)}
              onDelete={onDeleteTurn}
            />
          ))
        )}
      </div>

      {onSpeak && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: 8,
            padding: 12,
            borderTop: "1px solid #ddd",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelectUser?.(user.id)}
                style={{
                  padding: "6px 12px",
                  background: user.id === currentUserId ? "#007bff" : "#e9ecef",
                  color: user.id === currentUserId ? "white" : "#333",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {user.name}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setMessage(e.target.value)
            }
            placeholder={`${currentUser?.name || "ユーザー"}として発言...`}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            style={{
              padding: "8px 16px",
              background: message.trim() ? "#007bff" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: message.trim() ? "pointer" : "default",
            }}
          >
            送信
          </button>
        </form>
      )}
    </div>
  );
};
