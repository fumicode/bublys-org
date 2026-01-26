import React, { FC } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector, selectPocketItems, removePocketItem } from '@bublys-org/state-management';
import { PocketItemView } from './PocketItemView';
import { Box, Typography, IconButton } from '@mui/material';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import CloseIcon from '@mui/icons-material/Close';
import { DragDataType, parseDragPayload } from '@bublys-org/bubbles-ui';

type PocketViewProps = {
  onItemClick?: (url: string) => void;
  onDrop?: (url: string, type: DragDataType, label?: string) => void;
  onClose?: () => void;
};

export const PocketView: FC<PocketViewProps> = ({ onItemClick, onDrop, onClose }) => {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectPocketItems);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleRemove = (id: string) => {
    dispatch(removePocketItem(id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    const payload = parseDragPayload(e);
    // ドロップを許可するため常に preventDefault する（ハイライトは対応タイプのみ）
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(!!payload);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    const payload = parseDragPayload(e);
    if (!payload) {
      setIsDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (payload.url) {
      onDrop?.(payload.url, payload.type, payload.label);
    }
  };

  return (
    <StyledPocketView
      $isDragOver={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Box className="e-header">
        <WorkspacesIcon fontSize="small" />
        <Typography variant="subtitle2">ポケット</Typography>
        {onClose && (
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              marginLeft: 'auto',
              padding: '2px',
              pointerEvents: 'auto',
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box className="e-items">
        {items.length === 0 ? (
          <Typography variant="caption" className="e-empty">
            アイテムをドラッグ&ドロップ
          </Typography>
        ) : (
          items.map((item) => (
            <PocketItemView
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onClick={onItemClick}
            />
          ))
        )}
      </Box>
    </StyledPocketView>
  );
};

const StyledPocketView = styled.div<{ $isDragOver: boolean } & React.HTMLAttributes<HTMLDivElement>>`
  background: ${props => props.$isDragOver ? 'rgba(200, 230, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)'};
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid ${props => props.$isDragOver ? '#2196F3' : 'transparent'};
  min-width: 250px;
  max-width: 300px;
  transition: background 0.2s, border-color 0.2s;

  .e-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: #333;
    pointer-events: none;
  }

  .e-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 60px;

    > * {
      pointer-events: auto;
    }
  }

  .e-empty {
    color: #999;
    text-align: center;
    padding: 20px;
    display: block;
    pointer-events: none;
  }
`;
