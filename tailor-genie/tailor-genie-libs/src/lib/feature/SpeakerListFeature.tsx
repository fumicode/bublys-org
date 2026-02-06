"use client";

import { FC, useContext, useState, FormEvent, ChangeEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Speaker } from "@bublys-org/tailor-genie-model";
import { BubblesContext, ObjectView, registerObjectType } from "@bublys-org/bubbles-ui";
import { selectSpeakers, saveSpeaker } from "../slice/conversation-slice.js";

// Speakerをオブジェクト型として登録
registerObjectType("Speaker");

export const SpeakerListFeature: FC = () => {
  const dispatch = useDispatch();
  const speakers = useSelector(selectSpeakers);
  const { openBubble } = useContext(BubblesContext);
  const [newSpeakerName, setNewSpeakerName] = useState("");

  const handleOpenSpeaker = (speakerId: string) => {
    openBubble(`tailor-genie/speakers/${speakerId}`, "root");
  };

  const handleCreateSpeaker = (e: FormEvent) => {
    e.preventDefault();
    if (!newSpeakerName.trim()) return;

    const id = `speaker-${crypto.randomUUID().slice(0, 8)}`;
    // ドメインオブジェクトを作成
    const speaker = new Speaker({ id, name: newSpeakerName.trim() });
    dispatch(saveSpeaker(speaker.state));
    setNewSpeakerName("");
  };

  return (
    <div
      style={{
        padding: 16,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>スピーカー一覧</h2>
      </div>

      <form
        onSubmit={handleCreateSpeaker}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          value={newSpeakerName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewSpeakerName(e.target.value)
          }
          placeholder="新しいスピーカー名..."
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
          disabled={!newSpeakerName.trim()}
          style={{
            padding: "8px 16px",
            background: newSpeakerName.trim() ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: newSpeakerName.trim() ? "pointer" : "default",
          }}
        >
          追加
        </button>
      </form>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {speakers.length === 0 ? (
          <div style={{ color: "#999", textAlign: "center", marginTop: 32 }}>
            スピーカーがいません
          </div>
        ) : (
          speakers.map((speaker) => (
            <ObjectView
              key={speaker.id}
              type="Speaker"
              url={`tailor-genie/speakers/${speaker.id}`}
              label={speaker.name}
              onClick={() => handleOpenSpeaker(speaker.id)}
              fullWidth
            >
              <div
                style={{
                  padding: 12,
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                  {speaker.name}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  ID: {speaker.id}
                </div>
              </div>
            </ObjectView>
          ))
        )}
      </div>
    </div>
  );
};
