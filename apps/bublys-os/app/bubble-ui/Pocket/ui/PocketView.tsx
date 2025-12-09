import React, { FC } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector, selectPocketItems, removePocketItem } from '@bublys-org/state-management';
import { PocketItemView } from './PocketItemView';
import { Box, Typography } from '@mui/material';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import { DRAG_DATA_TYPE_LIST, DRAG_DATA_TYPES, DragDataType } from '../../utils/drag-types';

type PocketViewProps = {
  onItemClick?: (url: string) => void;
  onDrop?: (url: string, type: DragDataType, label?: string) => void;
};

export const PocketView: FC<PocketViewProps> = ({ onItemClick, onDrop }) => {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectPocketItems);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleRemove = (id: string) => {
    dispatch(removePocketItem(id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    console.log('[PocketView] handleDragOver called');
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    console.log('[PocketView] handleDragLeave called');
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    console.log('[PocketView] handleDrop called', { types: Array.from(e.dataTransfer.types) });
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // シンプルに3つのデータを取得
    const label = e.dataTransfer.getData('label');

    // bubble typeを検出
    let type: DragDataType = DRAG_DATA_TYPES.generic;

    for (const t of DRAG_DATA_TYPE_LIST) {
      if (e.dataTransfer.types.includes(t)) {
        type = t;
        break;
      }
    }


    
    const url = e.dataTransfer.getData(type);

    console.log('[PocketView] Parsed data', { url, label, type });

    if (url) {
      onDrop?.(url, type, label || undefined);
    } else {
      console.warn('[PocketView] No URL found, cannot add to pocket');
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

const StyledPocketView = styled.div<{ $isDragOver: boolean }>`
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
