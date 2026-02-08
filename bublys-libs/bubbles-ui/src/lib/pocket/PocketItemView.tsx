import { FC } from 'react';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { PocketItemState } from '@bublys-org/state-management';
import styled from 'styled-components';
import { getObjectType, getObjectTypeIcon, resolveObjectTypeLabel } from '../object-view/ObjectTypeRegistry.js';
import { ObjectView } from '../object-view/ObjectView.js';

type PocketItemViewProps = {
  item: PocketItemState;
  onRemove: (id: string) => void;
  onClick?: (url: string) => void;
};

export const PocketItemView: FC<PocketItemViewProps> = ({ item, onRemove, onClick }) => {
  const objectType = getObjectType(item.type);

  const icon = (objectType && getObjectTypeIcon(objectType)) || <InsertDriveFileIcon fontSize="small" />;
  const resolvedLabel = (objectType && item.objectId && resolveObjectTypeLabel(objectType, item.objectId)) || item.label || item.url;

  const content = (
    <div className="e-content" title={item.url}>
      <span className="e-icon">{icon}</span>
      <span className="e-label">{resolvedLabel}</span>
    </div>
  );

  return (
    <StyledPocketItem>
      <div className="e-content-wrapper">
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
      </div>
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

  .e-content-wrapper {
    flex: 1;
    min-width: 0;
    overflow: hidden;
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
