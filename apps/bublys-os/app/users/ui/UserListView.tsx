import { FC } from "react";
import styled from "styled-components";
import { User } from "../domain/User";
import { IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

type UserListViewProps = {
  users: User[];
  buildDetailUrl: (userId: string) => string;
  buildDeleteUrl: (userId: string) => string;
  onUserClick?: (userId: string, detailUrl: string) => void;
  onUserDelete?: (userId: string) => void;
};

export const UserListView: FC<UserListViewProps> = ({
  users,
  buildDetailUrl,
  buildDeleteUrl,
  onUserClick,
  onUserDelete,
}) => {
  return (
    <StyledUserList>
      {users.map((user) => {
        const detailUrl = buildDetailUrl(user.id);
        const deleteUrl = buildDeleteUrl(user.id);
        return (
          <li key={user.id} className="e-item">
            <div className="e-content">
              <button
                style={{ all: "unset", cursor: "pointer" }}
                data-link-target={detailUrl}
                onClick={() => onUserClick?.(user.id, detailUrl)}
              >
                <div className="e-name">{user.name}</div>
                <div className="e-meta">
                  {user.birthday} / {user.getAge()}歳
                </div>
              </button>
              <span className="e-button-group">
                <IconButton
                  size="small"
                  aria-label="delete user"
                  data-link-target={deleteUrl}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserDelete?.(user.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
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
  }
`;
