import { FC } from 'react';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PocketItemState } from '@bublys-org/state-management';
import styled from 'styled-components';
import { UserIcon, UserGroupIcon } from '../../../users/ui/UserIcon';
import { MemoIcon } from '../../../world-line/Memo/ui/MemoIcon';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

type PocketItemViewProps = {
  item: PocketItemState;
  onRemove: (id: string) => void;
  onClick?: (url: string) => void;
};

export const PocketItemView: FC<PocketItemViewProps> = ({ item, onRemove, onClick }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'user':
      case 'users':
        return <UserIcon fontSize="small" />;
      case 'user-group':
      case 'user-groups':
        return <UserGroupIcon fontSize="small" />;
      case 'memo':
      case 'memos':
        return <MemoIcon />;
      default:
        return <InsertDriveFileIcon fontSize="small" />;
    }
  };

  return (
    <StyledPocketItem>
      <button
        className="e-content"
        onClick={() => onClick?.(item.url)}
        title={item.url}
      >
        <span className="e-icon">{getIcon()}</span>
        <span className="e-label">{item.label || item.url}</span>
      </button>
      <IconButton
        size="small"
        className="e-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </StyledPocketItem>
  );
};

const StyledPocketItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: #e8e8e8;
  }

  .e-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    text-align: left;
    min-width: 0;
  }

  .e-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: #555;
  }

  .e-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9em;
  }

  .e-remove {
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;
