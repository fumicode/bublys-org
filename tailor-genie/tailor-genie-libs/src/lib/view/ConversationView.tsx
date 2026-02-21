"use client";

import { FC, useState, useRef, useEffect, useMemo, CSSProperties } from "react";
import { Conversation, Speaker, Turn } from "@bublys-org/tailor-genie-model";
import React from "react";
import { getDragType } from "@bublys-org/bubbles-ui";
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

export type ConversationViewProps = {
  conversation: Conversation;
  participants: Speaker[];
  onOpenSpeakerView?: (speakerId: string) => void;
  onAddParticipant?: (speakerId: string) => void;
  wlNav?: WlNavProps<Turn[]>;
};

export const ConversationView: FC<ConversationViewProps> = ({
  conversation,
  participants,
  onOpenSpeakerView,
  onAddParticipant,
  wlNav,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 50;
    wasAtBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

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

  const pendingQuestion = conversation.pendingQuestion;

  // forkPreviewsから、未回答質問の選択肢に対応するforkを抽出
  const { choiceToFork, visitedChoiceIds } = useMemo(() => {
    const map = new Map<string, () => void>();
    const ids = new Set<string>();
    if (pendingQuestion && wlNav) {
      for (const fork of wlNav.forkPreviews) {
        const first = fork.preview[0];
        if (first?.kind === "AnswerTurn" && first.questionTurnId === pendingQuestion.id) {
          map.set(first.choiceId, fork.onSelect);
          ids.add(first.choiceId);
        }
      }
    }
    return { choiceToFork: map, visitedChoiceIds: ids };
  }, [pendingQuestion, wlNav]);

  // 未回答質問に対応しないforkPreviewsだけ残す
  const nonAnswerForkPreviews = useMemo(() => {
    if (!wlNav || !pendingQuestion) return wlNav?.forkPreviews ?? [];
    return wlNav.forkPreviews.filter((fork) => {
      const first = fork.preview[0];
      return !(first?.kind === "AnswerTurn" && first.questionTurnId === pendingQuestion.id);
    });
  }, [wlNav, pendingQuestion]);

  const handleChoiceClick = (choiceId: string) => {
    const forkSelect = choiceToFork.get(choiceId);
    if (forkSelect) forkSelect();
  };

  const getChoiceText = (turn: Turn): string | undefined => {
    if (turn.kind !== "AnswerTurn") return undefined;
    return conversation.getChoiceText(turn.questionTurnId, turn.choiceId);
  };

  const speakerDragType = getDragType("Speaker");

  const handleDragOver = (e: React.DragEvent) => {
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
                  pendingQuestion && turn.id === pendingQuestion.id && choiceToFork.size > 0
                    ? handleChoiceClick
                    : undefined
                }
                visitedChoiceIds={
                  pendingQuestion && turn.id === pendingQuestion.id
                    ? visitedChoiceIds
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
              disabled={!wlNav.canRedo || wlNav.forkPreviews.length > 0 || !!pendingQuestion}
              style={{ ...arrowButtonStyle, ...(!wlNav.canRedo || wlNav.forkPreviews.length > 0 || pendingQuestion ? disabledStyle : {}) }}
            >
              ↓
            </button>
          </div>
        )}
        {nonAnswerForkPreviews.length > 0 && (
          <GhostTurnsView
            forkPreviews={nonAnswerForkPreviews}
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
    </div>
  );
};
