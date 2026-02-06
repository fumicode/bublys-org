"use client";

import { FC, useState, FormEvent, ChangeEvent } from "react";
import { Conversation, Speaker } from "@bublys-org/tailor-genie-model";
import { TurnView } from "./TurnView.js";

export type SpeakerViewProps = {
  conversation: Conversation;
  speaker: Speaker;
  allSpeakers: Speaker[];
  onSpeak?: (message: string) => void;
};

export const SpeakerView: FC<SpeakerViewProps> = ({
  conversation,
  speaker,
  allSpeakers,
  onSpeak,
}) => {
  const [message, setMessage] = useState("");

  const getSpeakerName = (speakerId: string): string => {
    const s = allSpeakers.find((sp) => sp.id === speakerId);
    return s?.name || speakerId;
  };

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
          {speaker.name} の画面
        </span>
        <span style={{ fontSize: 12, color: "#666" }}>
          会話 #{conversation.id.slice(0, 8)}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {conversation.turns.length === 0 ? (
          <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
            まだ発言がありません
          </div>
        ) : (
          conversation.turns.map((turn) => {
            const isSelf = turn.speakerId === speaker.id;
            return (
              <TurnView
                key={turn.id}
                turn={turn}
                speakerName={getSpeakerName(turn.speakerId)}
                align={isSelf ? "right" : "left"}
              />
            );
          })
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
          <input
            type="text"
            value={message}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setMessage(e.target.value)
            }
            placeholder={`${speaker.name}として発言...`}
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
