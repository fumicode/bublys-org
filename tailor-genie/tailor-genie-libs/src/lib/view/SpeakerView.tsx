"use client";

import { FC, useRef, useEffect, useMemo, CSSProperties } from "react";
import { Conversation, Speaker, Turn, type Choice } from "@bublys-org/tailor-genie-model";
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

export type SpeakerViewProps = {
  conversation: Conversation;
  speaker: Speaker;
  allSpeakers: Speaker[];
  onSpeak?: (message: string) => void;
  onAskQuestion?: (question: string, choices: Choice[]) => void;
  onAnswerQuestion?: (choiceId: string) => void;
  wlNav?: WlNavProps<Turn[]>;
  stateRefHash?: string | null;
};

export const SpeakerView: FC<SpeakerViewProps> = ({
  conversation,
  speaker,
  allSpeakers,
  onSpeak,
  onAskQuestion,
  onAnswerQuestion,
  wlNav,
  stateRefHash,
}) => {
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

  const pendingChoices = conversation.availableChoicesForGuest;
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

  const nonAnswerForkPreviews = useMemo(() => {
    if (!wlNav || !pendingQuestion) return wlNav?.forkPreviews ?? [];
    return wlNav.forkPreviews.filter((fork) => {
      const first = fork.preview[0];
      return !(first?.kind === "AnswerTurn" && first.questionTurnId === pendingQuestion.id);
    });
  }, [wlNav, pendingQuestion]);

  const handleChoiceClick = (choiceId: string) => {
    const forkSelect = choiceToFork.get(choiceId);
    if (forkSelect) {
      forkSelect();
    } else if (onAnswerQuestion) {
      onAnswerQuestion(choiceId);
    }
  };

  const getChoiceText = (turn: Turn): string | undefined => {
    if (turn.kind !== "AnswerTurn") return undefined;
    return conversation.getChoiceText(turn.questionTurnId, turn.choiceId);
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
        }}
      >
        <div style={{ fontSize: 10, color: "#999", fontFamily: "monospace", marginBottom: 4 }}>
          id: {conversation.id} / hash: {stateRefHash ?? "—"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold" }}>
            {speaker.name} の画面
          </span>
          <span style={{ fontSize: 12, color: "#666" }}>
            会話 #{conversation.id.slice(0, 8)}
          </span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}
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
                choiceText={getChoiceText(turn)}
                onChoiceClick={
                  speaker.isGuest &&
                  pendingQuestion &&
                  turn.id === pendingQuestion.id
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
            getAlign={(id) => (id === speaker.id ? "right" : "left")}
            getChoiceText={getChoiceText}
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
      ) : (onSpeak || onAskQuestion || onAnswerQuestion) ? (
        <ConversationInput
          speakerName={speaker.name}
          speakerRole={speaker.role}
          pendingChoices={pendingChoices}
          onSpeak={onSpeak}
          onAskQuestion={onAskQuestion}
          onAnswerQuestion={onAnswerQuestion}
        />
      ) : null}
    </div>
  );
};
