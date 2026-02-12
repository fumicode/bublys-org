"use client";

import { FC, useContext } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useTailorGenie } from "./TailorGenieProvider.js";

export const ConversationListFeature: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  const {
    conversationIds,
    addConversation,
    setActiveConversationId,
  } = useTailorGenie();

  const handleCreateConversation = () => {
    const id = crypto.randomUUID();
    addConversation(id);
    setActiveConversationId(id);
    openBubble(`tailor-genie/conversations/${id}`, "root");
  };

  const handleOpenConversation = (convId: string) => {
    setActiveConversationId(convId);
    openBubble(`tailor-genie/conversations/${convId}`, "root");
  };

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>会話一覧</h2>
        <button
          onClick={handleCreateConversation}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          新規作成
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {conversationIds.length === 0 ? (
          <div style={{ color: "#999", textAlign: "center", marginTop: 32 }}>
            会話がありません
          </div>
        ) : (
          conversationIds.map((id) => (
            <div
              key={id}
              onClick={() => handleOpenConversation(id)}
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                会話 #{id.slice(0, 8)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
