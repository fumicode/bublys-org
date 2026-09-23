import React, { FC } from 'react';
import styled from 'styled-components';
import { PocketItemState } from '@bublys-org/state-management';
import { PocketItemView } from './PocketItemView.js';
import { Box, Typography, IconButton } from '@mui/material';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import CloseIcon from '@mui/icons-material/Close';
import { DragDataType, hasDragPayload, parseDragPayload } from '../utils/drag-types.js';

type PocketViewProps = {
  items: PocketItemState[];
  onRemove: (id: string) => void;
  onItemClick?: (url: string) => void;
  onDrop?: (url: string, type: DragDataType, label?: string, objectId?: string) => void;
  onClose?: () => void;
  /**
   * **アイコンだけにする。** 箱が小さくて一覧が読めないときに立てる。
   * 一覧も巻物も出さない ── 入れるときは外に浮かぶ受け皿のほうへ落とす。
   */
  compact?: boolean;
};

export const PocketView: FC<PocketViewProps> = ({ items, onRemove, onItemClick, onDrop, onClose, compact }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    // ★ dragover では中身が読めない（保護モード）。型だけを見る ──
    //   `parseDragPayload` だと必ず null になり、光らないままになる
    const accepts = hasDragPayload(e);
    if (!accepts) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
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
      onDrop?.(payload.url, payload.type, payload.label, payload.objectId);
    }
  };

  return (
    <StyledPocketView
      $isDragOver={isDragOver}
      $compact={!!compact}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Box className="e-header">
        <WorkspacesIcon fontSize="small" />
        {!compact && <Typography variant="subtitle2">ポケット</Typography>}
        {!compact && onClose && (
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
      {!compact && (
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
              onRemove={onRemove}
              onClick={onItemClick}
            />
          ))
        )}
      </Box>
      )}
    </StyledPocketView>
  );
};

/**
 * ★ **箱いっぱいに広がる。** ポケットは 1 つの泡の中身なので、大きさを決めるのは泡のほう
 *   （前は画面の右下に置く固定の箱だったので、自分で 250〜300px を持っていた）。
 *   だから受け皿も**泡の面ぜんぶ**になる ── どこへ落としても入る。
 */
const StyledPocketView = styled.div<{ $isDragOver: boolean; $compact: boolean } & React.HTMLAttributes<HTMLDivElement>>`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  /* ★ アイコンだけのときは**箱を描かない**。印だけが空間の上に浮いて見える
     （旧の「画面の右下に置いたアイコン」と同じ姿）。落とし先として光るのは残す */
  background: ${props =>
    props.$isDragOver
      ? 'rgba(200, 230, 255, 0.95)'
      : props.$compact
        ? 'transparent'
        : 'rgba(255, 255, 255, 0.9)'};
  border-radius: 8px;
  padding: ${props => props.$compact ? '0' : '12px'};
  box-shadow: ${props => props.$compact ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: 2px solid ${props => props.$isDragOver ? '#2196F3' : 'transparent'};
  transition: background 0.2s, border-color 0.2s;

  .e-header {
    display: flex;
    align-items: center;
    justify-content: ${props => props.$compact ? 'center' : 'flex-start'};
    flex: ${props => props.$compact ? '1 1 auto' : '0 0 auto'};
    gap: 8px;
    margin-bottom: ${props => props.$compact ? '0' : '12px'};
    /* 空間の上に出るときは明るい印。白い箱の上では今までどおり暗い印 */
    color: ${props => (props.$compact && !props.$isDragOver ? '#dce8ff' : '#333')};
    pointer-events: none;
  }

  /* 一覧だけが巻物。アイコンだけのときは、そもそも出さない */
  .e-items {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;

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
