"use client";

import { FC, useState, FormEvent, ChangeEvent, useRef, useEffect, CSSProperties } from "react";
import { Conversation, Speaker, Turn } from "@bublys-org/tailor-genie-model";
import { type WlNavProps } from "@bublys-org/world-line-graph";
import { TurnView } from "./TurnView.js";
import { GhostTurnsView } from "./GhostTurnsView.js";

const arrowButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "1px solid #ddd",
  background: "#f5f5f5",
  color: "#999",
  cursor: "pointer",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const disabledStyle: CSSProperties = {
  opacity: 0.3,
  cursor: "default",
};

export type SpeakerViewProps = {
  conversation: Conversation;
  speaker: Speaker;
  allSpeakers: Speaker[];
  onSpeak?: (message: string) => void;
  wlNav?: WlNavProps<Turn[]>;
};

export const SpeakerView: FC<SpeakerViewProps> = ({
  conversation,
  speaker,
  allSpeakers,
  onSpeak,
  wlNav,
}) => {
  const [message, setMessage] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  // スクロール位置を監視
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 50;
    wasAtBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // 発言が増えたときに自動スクロール
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (wasAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [conversation.turns.length]);

  const getSpeaker = (speakerId: string) => {
    return allSpeakers.find((sp) => sp.id === speakerId);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSpeak) {
      onSpeak(message.trim());
      setMessage("");
    }
  };

  const isParticipant = conversation.hasParticipant(speaker.id);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 375,
        height: 667,
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
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

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}
      >
        {conversation.turns.length === 0 ? (
          <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
            まだ発言がありません
          </div>
        ) : (
          conversation.turns.map((turn) => {
            const turnSpeaker = getSpeaker(turn.speakerId);
            const isSelf = turn.speakerId === speaker.id;
            return (
              <TurnView
                key={turn.id}
                turn={turn}
                speakerName={turnSpeaker?.name || turn.speakerId}
                speakerRole={turnSpeaker?.role}
                align={isSelf ? "right" : "left"}
              />
            );
          })
        )}
        {wlNav && (wlNav.canUndo || wlNav.canRedo) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "4px 0" }}>
            <button
              onClick={wlNav.onUndo}
              disabled={!wlNav.canUndo}
              style={{ ...arrowButtonStyle, ...(wlNav.canUndo ? {} : disabledStyle) }}
            >
              ↑
            </button>
            <button
              onClick={wlNav.onRedo}
              disabled={!wlNav.canRedo || wlNav.forkPreviews.length > 0}
              style={{ ...arrowButtonStyle, ...(!wlNav.canRedo || wlNav.forkPreviews.length > 0 ? disabledStyle : {}) }}
            >
              ↓
            </button>
          </div>
        )}
        {wlNav && wlNav.forkPreviews.length > 0 && (
          <GhostTurnsView
            forkPreviews={wlNav.forkPreviews}
            getSpeakerName={(id) => getSpeaker(id)?.name || id}
            getSpeakerRole={(id) => getSpeaker(id)?.role}
            getAlign={(id) => (id === speaker.id ? "right" : "left")}
          />
        )}
      </div>

      {!isParticipant ? (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #ddd",
            background: "#fff3cd",
            color: "#856404",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          この会話に参加していません
        </div>
      ) : onSpeak ? (
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
      ) : null}
    </div>
  );
};
