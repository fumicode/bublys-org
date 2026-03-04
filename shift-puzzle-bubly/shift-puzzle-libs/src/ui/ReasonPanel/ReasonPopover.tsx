'use client';
import React from 'react';
import styled from 'styled-components';
import type { AssignmentState } from '@bublys-org/shift-puzzle-model';
import { AssignmentReason } from '@bublys-org/shift-puzzle-model';

export interface ReasonPopoverProps {
  assignment: AssignmentState;
  memberName: string;
  roleName: string;
  /** ビューポート基準のX座標（px） */
  top: number;
  /** ビューポート基準のY座標（px） */
  left: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  skill_match:   { bg: '#e8f5e9', text: '#2e7d32' },
  training:      { bg: '#fff3e0', text: '#e65100' },
  compatibility: { bg: '#fce4ec', text: '#880e4f' },
  availability:  { bg: '#e3f2fd', text: '#1565c0' },
  other:         { bg: '#f5f5f5', text: '#616161' },
};

/** F-3-2: 配置ブロックのホバーポップオーバー（position:fixed で親のoverflow:hiddenを突き抜ける） */
export const ReasonPopover: React.FC<ReasonPopoverProps> = ({
  assignment,
  memberName,
  roleName,
  top,
  left,
}) => {
  const reason = new AssignmentReason(assignment.reason);
  const colors = CATEGORY_COLORS[reason.category] ?? CATEGORY_COLORS.other;

  const formattedDate = (() => {
    try {
      return new Date(reason.createdAt).toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  return (
    <StyledPopover style={{ top, left }}>
      <div className="e-header">
        <span className="e-chip">{memberName || '?'}</span>
        <span className="e-arrow">→</span>
        <span className="e-chip e-role">{roleName || '?'}</span>
      </div>

      <span
        className="e-category-badge"
        style={{ background: colors.bg, color: colors.text }}
      >
        {reason.categoryLabel}
      </span>

      {reason.text ? (
        <div className="e-text">{reason.text}</div>
      ) : (
        <div className="e-text e-no-text">（詳細メモなし）</div>
      )}

      {(reason.createdBy || formattedDate) && (
        <div className="e-meta">
          {reason.createdBy && <span>記録: {reason.createdBy}</span>}
          {formattedDate && <span>{formattedDate}</span>}
        </div>
      )}

      {assignment.locked && (
        <div className="e-locked-badge">🔒 確定済み</div>
      )}
    </StyledPopover>
  );
};

// position:fixed はビューポート基準で表示されるため、
// 祖先要素の overflow:hidden の影響を受けない
const StyledPopover = styled.div`
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 180px;
  max-width: 280px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85em;

  .e-header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    .e-chip {
      background: #e3f2fd;
      color: #1565c0;
      padding: 1px 8px;
      border-radius: 12px;
      font-size: 0.88em;
      font-weight: 500;
    }

    .e-chip.e-role {
      background: #f3e5f5;
      color: #6a1b9a;
    }

    .e-arrow {
      color: #bbb;
      font-size: 0.85em;
    }
  }

  .e-category-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: 600;
    align-self: flex-start;
  }

  .e-text {
    font-size: 0.85em;
    color: #333;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .e-no-text {
    color: #bbb;
    font-style: italic;
  }

  .e-meta {
    display: flex;
    gap: 8px;
    font-size: 0.76em;
    color: #aaa;
    flex-wrap: wrap;
  }

  .e-locked-badge {
    font-size: 0.78em;
    color: #777;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
