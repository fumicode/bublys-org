"use client";

import { FC } from "react";
import { Turn, SpeakerRole } from "@bublys-org/tailor-genie-model";

export type TurnViewProps = {
  turn: Turn;
  speakerName?: string;
  speakerRole?: SpeakerRole;
  align?: "left" | "right";
  choiceText?: string;
  onChoiceClick?: (choiceId: string) => void;
  visitedChoiceIds?: ReadonlySet<string>;
};

const BUBBLE_COLORS: Record<SpeakerRole, { bg: string; color: string }> = {
  host: { bg: "#6f42c1", color: "white" },
  guest: { bg: "#e9ecef", color: "#333" },
};

export const TurnView: FC<TurnViewProps> = ({
  turn,
  speakerName,
  speakerRole = "guest",
  align = "left",
  choiceText,
  onChoiceClick,
  visitedChoiceIds,
}) => {
  const isRight = align === "right";
  const colors = BUBBLE_COLORS[speakerRole];

  return (
    <div>
      {/* 吹き出し部分 */}
      <div
        style={{
          padding: "8px 16px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: isRight ? "flex-end" : "flex-start",
        }}
      >
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          {speakerName || turn.speakerId}
        </div>
        <div
          style={{
            maxWidth: "80%",
            padding: "10px 14px",
            borderRadius: isRight ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: colors.bg,
            color: colors.color,
            fontSize: 14,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {turn.kind === "MessageTurn" && turn.message}
          {turn.kind === "QuestionTurn" && turn.question}
          {turn.kind === "AnswerTurn" && (choiceText || `→ ${turn.choiceId}`)}
        </div>
      </div>
      {/* 選択肢スライダー — パディングなしのフル幅、独自横スクロール */}
      {turn.kind === "QuestionTurn" && (
        <div
          style={{
            marginTop: 6,
            marginBottom: 8,
            paddingLeft: 16,
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <div style={{ display: "flex", gap: 8, width: "max-content", paddingRight: 16 }}>
            {turn.choices.map((c) => {
              const visited = visitedChoiceIds?.has(c.id);
              return onChoiceClick ? (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChoiceClick(c.id)}
                  style={{
                    width: 148,
                    minHeight: 40,
                    padding: "8px 12px",
                    borderRadius: 16,
                    border: `1.5px solid ${colors.bg}`,
                    background: visited ? `${colors.bg}10` : "#fff",
                    color: colors.bg,
                    fontSize: 13,
                    cursor: "pointer",
                    flexShrink: 0,
                    textAlign: "center",
                    wordBreak: "break-word",
                  }}
                >
                  {visited && <span style={{ marginRight: 4, fontSize: 11 }}>✓</span>}
                  {c.text}
                </button>
              ) : (
                <span
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 148,
                    minHeight: 36,
                    padding: "6px 12px",
                    borderRadius: 12,
                    background: "#e9ecef",
                    color: "#555",
                    fontSize: 12,
                    flexShrink: 0,
                    textAlign: "center",
                    wordBreak: "break-word",
                  }}
                >
                  {visited && <span style={{ marginRight: 4, fontSize: 10 }}>✓</span>}
                  {c.text}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
