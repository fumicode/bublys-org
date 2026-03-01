'use client';
import React from 'react';
import styled from 'styled-components';

export interface PickerItem {
  id: string;
  name: string;
  /** 役割の場合に使う色ドット */
  color?: string;
  /** 補足テキスト（参加可否など） */
  subtitle?: string;
}

interface PlacementPickerDialogProps {
  open: boolean;
  title: string;
  items: PickerItem[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}

/** セルクリック時に表示するメンバー or 役割ピッカー */
export const PlacementPickerDialog: React.FC<PlacementPickerDialogProps> = ({
  open,
  title,
  items,
  onSelect,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <Overlay onClick={onCancel}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <div className="e-header">
          <span className="e-title">{title}</span>
          <button className="e-close" onClick={onCancel} aria-label="閉じる">
            ✕
          </button>
        </div>
        {items.length === 0 ? (
          <div className="e-empty">対応可能な候補がありません</div>
        ) : (
          <ul className="e-list">
            {items.map((item) => (
              <li key={item.id} className="e-item" onClick={() => onSelect(item.id)}>
                {item.color && (
                  <span className="e-dot" style={{ background: item.color }} />
                )}
                <span className="e-name">{item.name}</span>
                {item.subtitle && <span className="e-sub">{item.subtitle}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;

const Panel = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  min-width: 280px;
  max-width: 360px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .e-title {
    font-size: 0.95em;
    font-weight: 600;
    color: #222;
  }

  .e-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9em;
    color: #999;
    padding: 4px 6px;
    border-radius: 4px;

    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }

  .e-empty {
    padding: 32px 24px;
    text-align: center;
    color: #999;
    font-size: 0.88em;
  }

  .e-list {
    list-style: none;
    margin: 0;
    padding: 6px 0;
    overflow-y: auto;
    flex: 1;
  }

  .e-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.1s;

    &:hover {
      background: #e3f2fd;
    }
  }

  .e-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .e-name {
    flex: 1;
    font-size: 0.9em;
    color: #222;
  }

  .e-sub {
    font-size: 0.76em;
    color: #888;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
