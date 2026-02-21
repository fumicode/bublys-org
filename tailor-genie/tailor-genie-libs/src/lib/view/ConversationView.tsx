"use client";

import { FC, useState, useRef, useEffect, CSSProperties } from "react";
import { Conversation, Speaker, Turn, type Choice } from "@bublys-org/tailor-genie-model";
import React from "react";
import { getDragType } from "@bublys-org/bubbles-ui";
import { type WlNavProps } from "@bublys-org/world-line-graph";
import { TurnView } from "./TurnView.js";
import { GhostTurnsView } from "./GhostTurnsView.js";
import { ConversationInput } from "./ConversationInput.js";

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

export type ConversationViewProps = {
  conversation: Conversation;
  participants: Speaker[];
  currentSpeakerId: string;
  onSelectSpeaker?: (speakerId: string) => void;
  onSpeak?: (message: string) => void;
  onAskQuestion?: (question: string, choices: Choice[]) => void;
  onAnswerQuestion?: (choiceId: string) => void;
  onOpenSpeakerView?: (speakerId: string) => void;
  onAddParticipant?: (speakerId: string) => void;
  wlNav?: WlNavProps<Turn[]>;
};

export const ConversationView: FC<ConversationViewProps> = ({
  conversation,
  participants,
  currentSpeakerId,
  onSelectSpeaker,
  onSpeak,
  onAskQuestion,
  onAnswerQuestion,
  onOpenSpeakerView,
  onAddParticipant,
  wlNav,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  // スクロール位置を監視
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 50; // 底から50px以内なら「底にいる」とみなす
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
    return participants.find((s) => s.id === speakerId);
  };

  const currentSpeaker = participants.find((s) => s.id === currentSpeakerId);
  const pendingChoices = conversation.availableChoicesForGuest;

  const pendingQuestion = conversation.pendingQuestion;

  const getChoiceText = (turn: Turn): string | undefined => {
    if (turn.kind !== "AnswerTurn") return undefined;
    return conversation.getChoiceText(turn.questionTurnId, turn.choiceId);
  };

  const speakerDragType = getDragType("Speaker");

  const handleDragOver = (e: React.DragEvent) => {
    // ドラッグオーバー時はtypesのみチェック（getDataは空を返す場合がある）
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(speakerDragType)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const url = e.dataTransfer.getData(speakerDragType);
    if (!url) return;

    // URLからspeakerIdを抽出: "tailor-genie/speakers/{speakerId}"
    const match = url.match(/^tailor-genie\/speakers\/(.+)$/);
    if (match && onAddParticipant) {
      onAddParticipant(match[1]);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 375,
        height: 667,
        border: isDragOver ? "2px dashed #007bff" : "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        background: isDragOver ? "#f0f7ff" : "#fff",
        transition: "all 0.2s",
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onOpenSpeakerView && participants.map((speaker) => (
            <button
              key={speaker.id}
              onClick={() => onOpenSpeakerView(speaker.id)}
              style={{
                padding: "4px 8px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {speaker.name}の画面
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}
      >
        {participants.length === 0 ? (
          <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
            スピーカーをドラッグ＆ドロップして追加してください
          </div>
        ) : conversation.turns.length === 0 ? (
          <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
            まだ発言がありません
          </div>
        ) : (
          conversation.turns.map((turn) => {
            const speaker = getSpeaker(turn.speakerId);
            const speakerIndex = participants.findIndex((s) => s.id === turn.speakerId);
            const align = speakerIndex === 0 ? "left" : "right";
            return (
              <TurnView
                key={turn.id}
                turn={turn}
                speakerName={speaker?.name || turn.speakerId}
                speakerRole={speaker?.role}
                align={align}
                choiceText={getChoiceText(turn)}
                onChoiceClick={
                  currentSpeaker?.role === "guest" &&
                  pendingQuestion &&
                  turn.id === pendingQuestion.id &&
                  onAnswerQuestion
                    ? onAnswerQuestion
                    : undefined
                }
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
            getAlign={(id) => {
              const idx = participants.findIndex((s) => s.id === id);
              return idx === 0 ? "left" : "right";
            }}
            getChoiceText={getChoiceText}
          />
        )}
      </div>

      {participants.length > 0 && (
        <div style={{ borderTop: "1px solid #ddd" }}>
          <div style={{ display: "flex", gap: 4, padding: "8px 12px 0" }}>
            {participants.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSpeaker?.(s.id)}
                style={{
                  padding: "6px 12px",
                  background: s.id === currentSpeakerId ? "#007bff" : "#e9ecef",
                  color: s.id === currentSpeakerId ? "white" : "#333",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          <ConversationInput
            speakerName={currentSpeaker?.name || "スピーカー"}
            speakerRole={currentSpeaker?.role || "guest"}
            pendingChoices={pendingChoices}
            onSpeak={onSpeak}
            onAskQuestion={onAskQuestion}
            onAnswerQuestion={onAnswerQuestion}
          />
        </div>
      )}
    </div>
  );
};
