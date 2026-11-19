"use client";
/** ゲーム一覧 ── 受け取ったものを並べるだけ */
import { FC } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { HENGE_GAME_OBJECT_TYPE } from "../object-type-registration.js";

export type GameListViewProps = {
  gameIds: string[];
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export const GameListView: FC<GameListViewProps> = ({ gameIds, onCreate, onDelete }) => (
  <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: "0.1em" }}>化 のゲーム</h2>
      <button
        onClick={onCreate}
        style={{
          padding: "7px 14px", background: "#d4503e", color: "#fff",
          border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13,
        }}
      >
        新しいゲーム
      </button>
    </div>

    <div style={{ flex: 1, overflowY: "auto" }}>
      {gameIds.length === 0 ? (
        <div style={{ color: "#999", textAlign: "center", marginTop: 32, fontSize: 13 }}>
          まだ 1 つもありません
        </div>
      ) : (
        gameIds.map((id) => (
          <ObjectView
            key={id}
            type={HENGE_GAME_OBJECT_TYPE}
            url={`henge/games/${id}`}
            label={`ゲーム #${id.slice(0, 8)}`}
            openingPosition="bubble-side-right"
            fullWidth
          >
            <div
              title="ダブルクリックで開く"
              style={{
                flex: 1, padding: "10px 12px", borderBottom: "1px solid #eee",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>ゲーム #{id.slice(0, 8)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                style={{
                  border: "none", background: "transparent", color: "#bbb",
                  cursor: "pointer", fontSize: 12,
                }}
              >
                消す
              </button>
            </div>
          </ObjectView>
        ))
      )}
    </div>
  </div>
);
