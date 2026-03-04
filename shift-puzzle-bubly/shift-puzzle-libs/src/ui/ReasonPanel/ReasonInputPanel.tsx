'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import type { AssignmentReasonState, ReasonCategory } from '@bublys-org/shift-puzzle-model';

export interface ReasonInputPanelProps {
  memberName?: string;
  roleName?: string;
  initialCategory?: ReasonCategory;
  initialText?: string;
  initialCreatedBy?: string;
  onSave: (reason: AssignmentReasonState) => void;
  onCancel?: () => void;
}

const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  skill_match:   'スキル適合',
  training:      '育成目的',
  compatibility: '相性考慮',
  availability:  '空き時間調整',
  other:         'その他',
};

/** F-3-1: 配置理由入力パネル（記録者フィールド付き、モーダルなし） */
export const ReasonInputPanel: React.FC<ReasonInputPanelProps> = ({
  memberName,
  roleName,
  initialCategory = 'skill_match',
  initialText = '',
  initialCreatedBy = '',
  onSave,
  onCancel,
}) => {
  const [category, setCategory] = useState<ReasonCategory>(initialCategory);
  const [text, setText] = useState(initialText);
  const [createdBy, setCreatedBy] = useState(initialCreatedBy);

  const handleSave = () => {
    onSave({
      category,
      text,
      createdBy,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <StyledPanel>
      <div className="e-title">配置理由を記録</div>

      {(memberName || roleName) && (
        <div className="e-info">
          {memberName && <span className="e-chip">{memberName}</span>}
          {roleName && (
            <>
              <span className="e-arrow">→</span>
              <span className="e-chip e-role">{roleName}</span>
            </>
          )}
        </div>
      )}

      <div className="e-field">
        <label className="e-field-label">カテゴリ</label>
        <div className="e-category-list">
          {(Object.entries(CATEGORY_LABELS) as [ReasonCategory, string][]).map(([key, label]) => (
            <label
              key={key}
              className={`e-category-btn ${category === key ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="reason-panel-category"
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
          rows={3}
          placeholder="配置の背景・理由を記入..."
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        />
      </div>

      <div className="e-footer">
        <div className="e-recorder">
          <label className="e-field-label">記録者</label>
          <input
            className="e-recorder-input"
            type="text"
            placeholder="名前を入力"
            value={createdBy}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatedBy(e.target.value)}
          />
        </div>
        <div className="e-actions">
          {onCancel && (
            <button className="e-btn e-btn-cancel" onClick={onCancel}>
              キャンセル
            </button>
          )}
          <button className="e-btn e-btn-save" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </StyledPanel>
  );
};

const StyledPanel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .e-title {
    font-size: 0.95em;
    font-weight: 600;
    color: #333;
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
    gap: 6px;
  }

  .e-field-label {
    font-size: 0.8em;
    color: #666;
    font-weight: 500;
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
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9em;
    resize: vertical;
    font-family: inherit;
    min-height: 72px;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    margin-top: 4px;
  }

  .e-recorder {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .e-recorder-input {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: inherit;
    max-width: 140px;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-actions {
    display: flex;
    gap: 8px;
  }

  .e-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 4px;
    font-size: 0.9em;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
  }

  .e-btn-cancel {
    background: #f5f5f5;
    color: #555;

    &:hover {
      background: #e0e0e0;
    }
  }

  .e-btn-save {
    background: #1976d2;
    color: white;

    &:hover {
      background: #1565c0;
    }
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
