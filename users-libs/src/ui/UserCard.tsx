/**
 * ユーザー 1 人の札 ── **一覧の中で 1 つの泡になる**中身。
 *
 * 前は巻物（スクロールする行の一覧）の中の行だった。泡にすると、並べ方の道具が
 * そのまま効く（縦に並べる／奥行きに重ねる）し、掴んで外へ出すこともできる。
 */
import { FC } from "react";
import styled from "styled-components";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ObjectView, UrledPlace } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import { selectUsers } from "../slice/index.js";
import { User } from "../domain/User.domain.js";
import { UserIcon } from "./UserIcon.js";

export const UserCard: FC<{ userId: string; onDelete?: (id: string) => void }> = ({ userId, onDelete }) => {
  const entity = useAppSelector(selectUsers).find((u) => u.id === userId);
  if (!entity) return <StyledCard>このユーザーは見つかりませんでした。</StyledCard>;
  const user = new User(entity.id, entity.name, entity.birthday);

  return (
    <StyledCard>
      {/* ダブルクリックで開く（開く先は**外の海**）／ドラッグでポケットや岸へ */}
      {/* ★ `openingPosition` は「開いてよい」の合図として要る（旧 ObjectView の決まり）。
          どこに置くかは新しい模型では親の View が決めるので、値そのものは使われない */}
      <ObjectView type="User" url={`users/${userId}`} label={user.name} openingPosition="bubble-side-right">
        <div className="e-main">
          <UserIcon fontSize="small" className="e-avatar" />
          <div className="e-text">
            <div className="e-name">{user.name}</div>
            <div className="e-meta">{user.birthday} / {user.getAge()}歳</div>
          </div>
        </div>
      </ObjectView>
      <UrledPlace url={`users/${userId}/delete-confirm`}>
        <IconButton
          size="small"
          className="e-remove"
          aria-label="remove user"
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(userId);
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </UrledPlace>
    </StyledCard>
  );
};

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .e-avatar { color: #444; }
  .e-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .e-name { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .e-meta { color: #555; font-size: 0.85em; }
  .e-remove { flex: 0 0 auto; }
`;
