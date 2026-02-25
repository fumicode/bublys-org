"use client";

import { FC, useState, FormEvent, ChangeEvent } from "react";
import { type SpeakerRole, type Choice } from "@bublys-org/tailor-genie-model";

export type ConversationInputProps = {
  speakerName: string;
  speakerRole: SpeakerRole;
  pendingChoices?: Choice[];
  onSpeak?: (message: string) => void;
  onAskQuestion?: (question: string, choices: Choice[]) => void;
  onAnswerQuestion?: (choiceId: string) => void;
};

export const ConversationInput: FC<ConversationInputProps> = ({
  speakerName,
  speakerRole,
  pendingChoices,
  onSpeak,
  onAskQuestion,
  onAnswerQuestion,
}) => {
  const [mode, setMode] = useState<"message" | "question">("message");
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [choiceTexts, setChoiceTexts] = useState(["", ""]);
  const [choiceImageUrls, setChoiceImageUrls] = useState(["", ""]);

  // Guest + 未回答質問あり → 選択肢は吹き出し横に表示されるので、ここではヒントのみ
  if (speakerRole === "guest" && pendingChoices) {
    return (
      <div
        style={{
          padding: 12,
          borderTop: "1px solid #ddd",
          color: "#999",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        選択肢をタップして回答してください
      </div>
    );
  }

  // Host + 未回答質問あり → 待機表示
  if (speakerRole === "host" && pendingChoices) {
    return (
      <div
        style={{
          padding: 12,
          borderTop: "1px solid #ddd",
          color: "#999",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        ゲストの回答を待っています...
      </div>
    );
  }

  // Host + 質問モード
  if (speakerRole === "host" && mode === "question" && onAskQuestion) {
    const handleAddChoice = () => {
      setChoiceTexts([...choiceTexts, ""]);
      setChoiceImageUrls([...choiceImageUrls, ""]);
    };

    const handleRemoveChoice = (index: number) => {
      if (choiceTexts.length <= 2) return;
      setChoiceTexts(choiceTexts.filter((_, i) => i !== index));
      setChoiceImageUrls(choiceImageUrls.filter((_, i) => i !== index));
    };

    const handleChoiceChange = (index: number, value: string) => {
      const updated = [...choiceTexts];
      updated[index] = value;
      setChoiceTexts(updated);
    };

    const handleImageUrlChange = (index: number, value: string) => {
      const updated = [...choiceImageUrls];
      updated[index] = value;
      setChoiceImageUrls(updated);
    };

    const canSubmit =
      question.trim() &&
      choiceTexts.filter((t) => t.trim()).length >= 2;

    const handleSubmitQuestion = (e: FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      const choices: Choice[] = choiceTexts
        .map((text, i) => ({ text, imageUrl: choiceImageUrls[i] }))
        .filter((c) => c.text.trim())
        .map((c) => ({
          id: crypto.randomUUID(),
          text: c.text.trim(),
          ...(c.imageUrl.trim() ? { imageUrl: c.imageUrl.trim() } : {}),
        }));
      onAskQuestion(question.trim(), choices);
      setQuestion("");
      setChoiceTexts(["", ""]);
      setChoiceImageUrls(["", ""]);
      setMode("message");
    };

    return (
      <form
        onSubmit={handleSubmitQuestion}
        style={{
          padding: 12,
          borderTop: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6f42c1", fontWeight: "bold" }}>質問モード</span>
          <button
            type="button"
            onClick={() => setMode("message")}
            style={{
              padding: "2px 8px",
              background: "none",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: "#666",
            }}
          >
            キャンセル
          </button>
        </div>
        <input
          type="text"
          value={question}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
          placeholder="質問を入力..."
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#888" }}>選択肢</span>
          {choiceTexts.map((text, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  value={text}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChoiceChange(i, e.target.value)
                  }
                  placeholder={`選択肢 ${i + 1}`}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                />
                {choiceTexts.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChoice(i)}
                    style={{
                      padding: "4px 8px",
                      background: "none",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#999",
                    }}
                  >
                    x
                  </button>
                )}
              </div>
              <input
                type="text"
                value={choiceImageUrls[i]}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleImageUrlChange(i, e.target.value)
                }
                placeholder="画像URL（任意）"
                style={{
                  padding: "4px 10px",
                  border: "1px solid #eee",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "#888",
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddChoice}
            style={{
              padding: "4px 8px",
              background: "none",
              border: "1px dashed #ccc",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              color: "#999",
              alignSelf: "flex-start",
            }}
          >
            + 選択肢を追加
          </button>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "8px 16px",
            background: canSubmit ? "#6f42c1" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: canSubmit ? "pointer" : "default",
          }}
        >
          質問を送信
        </button>
      </form>
    );
  }

  // 通常メッセージモード
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSpeak) {
      onSpeak(message.trim());
      setMessage("");
    }
  };

  return (
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
        onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
        placeholder={`${speakerName}として発言...`}
        style={{
          flex: 1,
          padding: "8px 12px",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 14,
        }}
      />
      {speakerRole === "host" && onAskQuestion && (
        <button
          type="button"
          onClick={() => setMode("question")}
          style={{
            padding: "8px 12px",
            background: "none",
            border: "1px solid #6f42c1",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            color: "#6f42c1",
          }}
        >
          質問
        </button>
      )}
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
  );
};
