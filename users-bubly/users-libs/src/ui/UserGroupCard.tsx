/**
 * グループ 1 つの札 ── **一覧の中で 1 つの泡になる**中身。
 */
import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import { selectUserGroups } from "../slice/index.js";
import { UserGroupIcon } from "./UserIcon.js";

export const UserGroupCard: FC<{ groupId: string }> = ({ groupId }) => {
  const group = useAppSelector(selectUserGroups).find((g) => g.id === groupId);
  if (!group) return <StyledCard>このグループは見つかりませんでした。</StyledCard>;

  return (
    <StyledCard>
      {/* ダブルクリックで開く（開く先は**外の海**）／ドラッグでポケットや岸へ */}
      <ObjectView
        type="UserGroup"
        url={`user-groups/${groupId}`}
        label={group.name}
        openingPosition="bubble-side-right"
      >
        <div className="e-main">
          <UserGroupIcon fontSize="small" className="e-avatar" />
          <div className="e-text">
            <div className="e-name">{group.name}</div>
            <div className="e-meta">{group.userIds?.length ?? 0}人</div>
          </div>
        </div>
      </ObjectView>
    </StyledCard>
  );
};

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-main { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .e-avatar { color: #444; }
  .e-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .e-name { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .e-meta { color: #555; font-size: 0.85em; }
`;
