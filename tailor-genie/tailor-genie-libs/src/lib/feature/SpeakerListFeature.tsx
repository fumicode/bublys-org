"use client";

import { FC, useContext, useState, FormEvent, ChangeEvent } from "react";
import { Speaker, SpeakerRole } from "@bublys-org/tailor-genie-model";
import { BubblesContext, ObjectView, registerObjectType } from "@bublys-org/bubbles-ui";
import { useTailorGenie } from "./TailorGenieProvider.js";

// Speakerをオブジェクト型として登録
registerObjectType("Speaker");

const ROLE_LABELS: Record<SpeakerRole, string> = {
  host: "ホスト",
  guest: "ゲスト",
};

const ROLE_COLORS: Record<SpeakerRole, string> = {
  host: "#6f42c1",
  guest: "#28a745",
};

export const SpeakerListFeature: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  const { speakerShells, addSpeaker } = useTailorGenie();
  const speakers = speakerShells.map((s) => s.object);
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newSpeakerRole, setNewSpeakerRole] = useState<SpeakerRole>("guest");

  const handleOpenSpeaker = (speakerId: string) => {
    openBubble(`tailor-genie/speakers/${speakerId}`, "root");
  };

  const handleCreateSpeaker = (e: FormEvent) => {
    e.preventDefault();
    if (!newSpeakerName.trim()) return;

    const id = `speaker-${crypto.randomUUID().slice(0, 8)}`;
    const speaker = new Speaker({
      id,
      name: newSpeakerName.trim(),
      role: newSpeakerRole,
    });
    addSpeaker(speaker);
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
          flexWrap: "wrap",
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
            minWidth: 120,
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <select
          value={newSpeakerRole}
          onChange={(e) => setNewSpeakerRole(e.target.value as SpeakerRole)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
            background: "white",
          }}
        >
          <option value="host">ホスト</option>
          <option value="guest">ゲスト</option>
        </select>
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                    {speaker.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    ID: {speaker.id}
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 8px",
                    background: ROLE_COLORS[speaker.role],
                    color: "white",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  {ROLE_LABELS[speaker.role]}
                </span>
              </div>
            </ObjectView>
          ))
        )}
      </div>
    </div>
  );
};
