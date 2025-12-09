import { FC } from "react";
import styled from "styled-components";
import { User } from "../domain/User.domain";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { UserIcon } from "./UserIcon";
import { UrledPlace } from "../../bubble-ui/components";

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
              e.dataTransfer.effectAllowed = "linkMove";
              e.dataTransfer.setData("text/user-id", user.id);
            }}
            onDragOver={(e) => {
              if (!showReorder) return;
              e.preventDefault();
            }}
            onDrop={(e) => {
              if (!showReorder) return;

              const sourceId = e.dataTransfer.getData("text/user-id");
              if (!sourceId || sourceId === user.id) return;
              const existsInList = users.some((u) => u.id === sourceId);
              if (!existsInList) {
                // Allow bubbling so the parent container can handle adding external users.
                e.preventDefault();
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