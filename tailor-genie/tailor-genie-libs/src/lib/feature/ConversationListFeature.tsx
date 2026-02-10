"use client";

import { FC, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Conversation } from "@bublys-org/tailor-genie-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import {
  selectConversations,
  saveConversation,
  setActiveConversation,
} from "../slice/conversation-slice.js";

export const ConversationListFeature: FC = () => {
  const dispatch = useDispatch();
  const conversations = useSelector(selectConversations);
  const { openBubble } = useContext(BubblesContext);

  const handleCreateConversation = () => {
    const id = crypto.randomUUID();
    // ドメインオブジェクトを作成
    const conversation = new Conversation({ id, participantIds: [], turns: [] });
    dispatch(saveConversation(conversation.state));
    dispatch(setActiveConversation(id));
    openBubble(`tailor-genie/conversations/${id}`, "root");
  };

  const handleOpenConversation = (convId: string) => {
    dispatch(setActiveConversation(convId));
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
        {conversations.length === 0 ? (
          <div style={{ color: "#999", textAlign: "center", marginTop: 32 }}>
            会話がありません
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleOpenConversation(conv.id)}
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                会話 #{conv.id.slice(0, 8)}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {conv.turns.length} 件の発言 / {conv.participantIds.length} 人参加
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
