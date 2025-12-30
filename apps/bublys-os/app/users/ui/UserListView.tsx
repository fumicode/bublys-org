import { FC } from "react";
import styled from "styled-components";
import { User } from "../domain/User.domain";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { UserIcon } from "./UserIcon";
import { UrledPlace } from "../../bubble-ui/components";
import { extractIdFromUrl } from "../../bubble-ui/utils/url-parser";
import { DRAG_DATA_TYPES, parseDragPayload, setDragPayload } from "../../bubble-ui/utils/drag-types";

type UserListViewProps = {
  users: User[];
  buildDetailUrl: (userId: string) => string;
  buildDeleteUrl: (userId: string) => string;
  onUserClick?: (userId: string, detailUrl: string) => void;
  onUserDelete?: (userId: string) => void;
  showReorder?: boolean;
  onReorder?: (sourceUserId: string, targetUserId: string) => void;
};

export const UserListView: FC<UserListViewProps> = ({
  users,
  buildDetailUrl,
  buildDeleteUrl,
  onUserClick,
  onUserDelete,
  showReorder = false,
  onReorder,
}) => {
  return (
    <StyledUserList>
      {users.map((user, index) => {
        const detailUrl = buildDetailUrl(user.id);
        const deleteUrl = buildDeleteUrl(user.id);
        return (
          <li
            key={user.id}
            className="e-item"
            draggable={true}
            onDragStart={(e) => {
              console.log('[UserListView] onDragStart', { userId: user.id, userName: user.name, showReorder, detailUrl });

              setDragPayload(e, {
                type: DRAG_DATA_TYPES.user,
                url: detailUrl,
                label: user.name,
              });
            }}
            onDragOver={(e) => {
              if (!showReorder) {
                // リオーダーモードでない場合は、preventDefault()しない（ポケットへのドロップを許可）
                return;
              }
              e.preventDefault();
            }}
            onDrop={(e) => {
              if (!showReorder) {
                // リオーダーモードでない場合は、イベントをバブリングさせる（ポケットへのドロップを許可）
                // preventDefault()もstopPropagation()も呼ばない
                return;
              }

              // URLからユーザーIDを抽出
              const payload = parseDragPayload(e, { acceptTypes: [DRAG_DATA_TYPES.user] });
              if (!payload) return;
              const sourceId = extractIdFromUrl(payload.url);
              if (!sourceId || sourceId === user.id) return;
              const existsInList = users.some((u) => u.id === sourceId);
              if (!existsInList) {
                // リスト外のユーザーの場合もバブリングさせる
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              onReorder?.(sourceId, user.id);
            }}
          > 
            <div className="e-content">
              {showReorder && (
                <span className="e-drag-handle" aria-label="drag user">
                  <DragIndicatorIcon fontSize="small" />
                </span>
              )}
              <UrledPlace url={detailUrl}>
                <button
                  style={{ all: "unset", cursor: "pointer" }}
                  onClick={() => onUserClick?.(user.id, detailUrl)}
                >
                  <div className="e-main">
                    <UserIcon fontSize="small" className="e-avatar" />
                    <div className="e-text">
                      <div className="e-name">{user.name}</div>
                      <div className="e-meta">
                        {user.birthday} / {user.getAge()}歳
                      </div>
                    </div>
                  </div>
                </button>
              </UrledPlace>
              <span className="e-button-group">
                <UrledPlace url={deleteUrl}>
                  <IconButton
                    size="small"
                    aria-label="remove user"
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserDelete?.(user.id);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </UrledPlace>
              </span>
            </div>
          </li>
        );
      })}
    </StyledUserList>
  );
};





const StyledUserList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  > .e-item {
    padding: 8px 0;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    > .e-content {
      display: block;
      width: 100%;
      padding: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .e-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .e-avatar {
      color: #444;
    }

    .e-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .e-name {
      font-weight: bold;
    }

    .e-meta {
      color: #555;
      font-size: 0.85em;
    }

    .e-button-group {
      flex-shrink: 0;
    }

    .e-drag-handle {
      cursor: grab;
      display: inline-flex;
      align-items: center;
      color: #777;
    }
  }
`;
