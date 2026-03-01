'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import type { AssignmentReasonState, ReasonCategory } from '@bublys-org/shift-puzzle-model';

export interface ReasonInputDialogProps {
  open: boolean;
  memberName?: string;
  roleName?: string;
  /** 役割選択が必要な場合 */
  roles?: Array<{ id: string; name: string; color: string }>;
  selectedRoleId?: string;
  onRoleChange?: (roleId: string) => void;
  /** 時間帯選択が必要な場合（MemberCardダブルクリック等） */
  timeSlots?: Array<{ id: string; label: string }>;
  selectedTimeSlotId?: string;
  onTimeSlotChange?: (slotId: string) => void;
  onConfirm: (reason: AssignmentReasonState) => void;
  onCancel: () => void;
}

const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  skill_match:     'スキル適合',
  training:        '育成目的',
  compatibility:   '相性考慮',
  availability:    '参加可能なため',
  other:           'その他',
};

/** F-2-5: 配置理由入力ダイアログ */
export const ReasonInputDialog: React.FC<ReasonInputDialogProps> = ({
  open,
  memberName,
  roleName,
  roles,
  selectedRoleId,
  onRoleChange,
  timeSlots,
  selectedTimeSlotId,
  onTimeSlotChange,
  onConfirm,
  onCancel,
}) => {
  const [category, setCategory] = useState<ReasonCategory>('skill_match');
  const [text, setText] = useState('');

  if (!open) return null;

  const canConfirm =
    (!roles || roles.length === 0 || !!selectedRoleId) &&
    (!timeSlots || timeSlots.length === 0 || !!selectedTimeSlotId);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      category,
      text,
      createdBy: '',
      createdAt: new Date().toISOString(),
    });
    setText('');
    setCategory('skill_match');
  };

  const handleCancel = () => {
    setText('');
    setCategory('skill_match');
    onCancel();
  };

  return (
    <StyledOverlay onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
      <StyledPanel>
        <div className="e-header">
          <span className="e-title">配置理由を入力</span>
        </div>

        <div className="e-info">
          {memberName && <span className="e-chip">{memberName}</span>}
          {roleName && <><span className="e-arrow">→</span><span className="e-chip e-role">{roleName}</span></>}
        </div>

        {/* 役割選択 */}
        {roles && roles.length > 0 && (
          <div className="e-field">
            <label className="e-field-label">役割</label>
            <select
              className="e-select"
              value={selectedRoleId ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onRoleChange?.(e.target.value)}
            >
              <option value="">選択してください</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 時間帯選択 */}
        {timeSlots && timeSlots.length > 0 && (
          <div className="e-field">
            <label className="e-field-label">時間帯</label>
            <select
              className="e-select"
              value={selectedTimeSlotId ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onTimeSlotChange?.(e.target.value)}
            >
              <option value="">選択してください</option>
              {timeSlots.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="e-field">
          <label className="e-field-label">理由カテゴリ</label>
          <div className="e-category-list">
            {(Object.entries(CATEGORY_LABELS) as [ReasonCategory, string][]).map(([key, label]) => (
              <label key={key} className={`e-category-btn ${category === key ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="category"
                  value={key}
                  checked={category === key}
                  onChange={() => setCategory(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="e-field">
          <label className="e-field-label">詳細メモ（任意）</label>
          <textarea
            className="e-textarea"
            rows={2}
            placeholder="配置の背景・理由を記入..."
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          />
        </div>

        <div className="e-actions">
          <button className="e-btn e-btn-cancel" onClick={handleCancel}>
            キャンセル
          </button>
          <button className="e-btn e-btn-confirm" onClick={handleConfirm} disabled={!canConfirm}>
            配置を確定
          </button>
        </div>
      </StyledPanel>
    </StyledOverlay>
  );
};

const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;

const StyledPanel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  width: 360px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;

  .e-header {
    .e-title {
      font-size: 1em;
      font-weight: 600;
      color: #333;
    }
  }

  .e-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .e-chip {
      background: #e3f2fd;
      color: #1565c0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 500;
    }

    .e-chip.e-role {
      background: #f3e5f5;
      color: #6a1b9a;
    }

    .e-arrow {
      color: #888;
      font-size: 0.9em;
    }
  }

  .e-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-field-label {
    font-size: 0.8em;
    color: #666;
    font-weight: 500;
  }

  .e-select {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9em;
    background: white;
  }

  .e-category-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .e-category-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid #ddd;
    border-radius: 16px;
    font-size: 0.82em;
    cursor: pointer;
    background: white;

    input[type="radio"] {
      display: none;
    }

    &.is-selected {
      background: #1976d2;
      border-color: #1976d2;
      color: white;
    }

    &:hover:not(.is-selected) {
      background: #f0f4ff;
      border-color: #90caf9;
    }
  }

  .e-textarea {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9em;
    resize: vertical;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .e-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 4px;
    font-size: 0.9em;
    cursor: pointer;
    font-weight: 500;
  }

  .e-btn-cancel {
    background: #f5f5f5;
    color: #555;

    &:hover {
      background: #e0e0e0;
    }
  }

  .e-btn-confirm {
    background: #1976d2;
    color: white;

    &:hover:not(:disabled) {
      background: #1565c0;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
