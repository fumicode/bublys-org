import { FC } from 'react';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PocketItemState } from '@bublys-org/state-management';
import styled from 'styled-components';
import { UserIcon, UserGroupIcon } from '../../../users/ui/UserIcon';
import { MemoIcon } from '../../../world-line/Memo/ui/MemoIcon';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PersonIcon from '@mui/icons-material/Person';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { ObjectView } from '../../object-view/ui/ObjectView';
import { getObjectType } from '../../object-view/domain/ObjectTypeRegistry';

type PocketItemViewProps = {
  item: PocketItemState;
  onRemove: (id: string) => void;
  onClick?: (url: string) => void;
};

export const PocketItemView: FC<PocketItemViewProps> = ({ item, onRemove, onClick }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'type/user':
      case 'type/users':
        return <UserIcon fontSize="small" />;
      case 'type/user-group':
      case 'type/user-groups':
        return <UserGroupIcon fontSize="small" />;
      case 'type/memo':
      case 'type/memos':
        return <MemoIcon />;
      case 'type/staff':
        return <PersonIcon fontSize="small" />;
      case 'type/staff-availability':
        return <EventAvailableIcon fontSize="small" />;
      default:
        return <InsertDriveFileIcon fontSize="small" />;
    }
  };

  // DragDataType から ObjectType を逆引き（ドラッグ用）
  const objectType = getObjectType(item.type);

  // ObjectTypeが見つからない場合はドラッグ不可
  const content = (
    <div className="e-content" title={item.url}>
      <span className="e-icon">{getIcon()}</span>
      <span className="e-label">{item.label || item.url}</span>
    </div>
  );

  return (
    <StyledPocketItem>
      {objectType ? (
        <ObjectView
          type={objectType}
          url={item.url}
          label={item.label}
          onClick={() => onClick?.(item.url)}
          draggable={true}
        >
          {content}
        </ObjectView>
      ) : (
        <button
          className="e-content-button"
          onClick={() => onClick?.(item.url)}
          title={item.url}
        >
          {content}
        </button>
      )}
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
    margin-left: auto;
    opacity: 0.5;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;
