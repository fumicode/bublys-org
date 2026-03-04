'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import type {
  MemberState,
  TimeSlotState,
  SkillDefinitionState,
} from '@bublys-org/shift-puzzle-model';

export interface MemberFormProps {
  /** 編集対象（undefined = 新規作成） */
  initial?: MemberState;
  eventId: string;
  skillDefinitions: ReadonlyArray<SkillDefinitionState>;
  timeSlots: ReadonlyArray<TimeSlotState>;
  /** 既存タグ（サジェスト用） */
  existingTags?: string[];
  onSave: (data: Omit<MemberState, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

/** F-1-1〜F-1-4: メンバー追加・編集フォーム */
export const MemberForm: React.FC<MemberFormProps> = ({
  initial,
  skillDefinitions,
  timeSlots,
  existingTags = [],
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [tags, setTags] = useState<string[]>(initial ? [...initial.tags] : []);
  const [tagInput, setTagInput] = useState('');
  const [skills, setSkills] = useState<string[]>(initial ? [...initial.skills] : []);
  const [availableSlotIds, setAvailableSlotIds] = useState<string[]>(
    initial ? [...initial.availableSlotIds] : []
  );

  // 日ごとにスロットをグループ化
  const dayGroups = groupSlotsByDay(timeSlots);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const toggleSlot = (slotId: string) => {
    setAvailableSlotIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const toggleAllDay = (daySlots: TimeSlotState[]) => {
    const allSelected = daySlots.every((s) => availableSlotIds.includes(s.id));
    if (allSelected) {
      setAvailableSlotIds((prev) => prev.filter((id) => !daySlots.some((s) => s.id === id)));
    } else {
      const toAdd = daySlots.map((s) => s.id).filter((id) => !availableSlotIds.includes(id));
      setAvailableSlotIds((prev) => [...prev, ...toAdd]);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), memo, tags, skills, availableSlotIds });
  };

  const suggestTags = existingTags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()));

  return (
    <StyledForm>
      <div className="e-title">{initial ? 'メンバーを編集' : '新しいメンバーを追加'}</div>

      {/* F-1-1: 名前 */}
      <div className="e-field">
        <label className="e-field-label">名前 <span className="e-required">*</span></label>
        <input
          className="e-input"
          type="text"
          placeholder="例: 田中 太郎"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          autoFocus
        />
      </div>

      {/* F-1-4: タグ */}
      <div className="e-field">
        <label className="e-field-label">タグ（部門・学年・役職等）</label>
        <div className="e-tag-area">
          {tags.map((tag) => (
            <span key={tag} className="e-tag">
              {tag}
              <button
                className="e-tag-remove"
                onClick={() => handleRemoveTag(tag)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          <div className="e-tag-input-wrap">
            <input
              className="e-tag-input"
              type="text"
              placeholder="タグを入力..."
              value={tagInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
            />
            {tagInput && (
              <button
                className="e-tag-add-btn"
                type="button"
                onClick={() => handleAddTag(tagInput)}
              >
                追加
              </button>
            )}
          </div>
        </div>
        {suggestTags.length > 0 && tagInput && (
          <div className="e-tag-suggests">
            {suggestTags.slice(0, 5).map((t) => (
              <button key={t} className="e-suggest-btn" type="button" onClick={() => handleAddTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        {existingTags.filter((t) => !tags.includes(t)).length > 0 && !tagInput && (
          <div className="e-tag-suggests">
            <span className="e-suggest-label">既存のタグ:</span>
            {existingTags.filter((t) => !tags.includes(t)).slice(0, 6).map((t) => (
              <button key={t} className="e-suggest-btn" type="button" onClick={() => handleAddTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* F-1-2: スキル */}
      {skillDefinitions.length > 0 && (
        <div className="e-field">
          <label className="e-field-label">スキル</label>
          <div className="e-skill-list">
            {skillDefinitions.map((def) => (
              <label key={def.id} className={`e-skill-btn ${skills.includes(def.id) ? 'is-selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={skills.includes(def.id)}
                  onChange={() => toggleSkill(def.id)}
                />
                {def.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* F-1-3: 参加可能時間帯 */}
      {timeSlots.length > 0 && (
        <div className="e-field">
          <label className="e-field-label">
            参加可能時間帯
            <span className="e-slot-count">（{availableSlotIds.length}/{timeSlots.length} 選択中）</span>
          </label>
          <div className="e-slot-days">
            {dayGroups.map(({ dayIndex, slots }) => {
              const allSelected = slots.every((s) => availableSlotIds.includes(s.id));
              return (
                <div key={dayIndex} className="e-slot-day">
                  <div className="e-slot-day-header">
                    <button
                      className={`e-day-toggle ${allSelected ? 'is-all' : ''}`}
                      type="button"
                      onClick={() => toggleAllDay(slots)}
                    >
                      Day {dayIndex + 1}
                    </button>
                  </div>
                  <div className="e-slot-row">
                    {slots.map((slot) => {
                      const selected = availableSlotIds.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          className={`e-slot-btn ${selected ? 'is-selected' : ''}`}
                          type="button"
                          onClick={() => toggleSlot(slot.id)}
                          title={`${formatMin(slot.startMinute)}〜${formatMin(slot.startMinute + slot.durationMinutes)}`}
                        >
                          {formatMin(slot.startMinute)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* メモ */}
      <div className="e-field">
        <label className="e-field-label">メモ（内部用・非公開）</label>
        <textarea
          className="e-textarea"
          rows={2}
          placeholder="性格・得意なこと・注意事項など..."
          value={memo}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemo(e.target.value)}
        />
      </div>

      <div className="e-actions">
        <button className="e-btn e-btn-cancel" type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button
          className="e-btn e-btn-save"
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {initial ? '更新' : '追加'}
        </button>
      </div>
    </StyledForm>
  );
};

// ========== ユーティリティ ==========

function formatMin(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function groupSlotsByDay(slots: ReadonlyArray<TimeSlotState>): { dayIndex: number; slots: TimeSlotState[] }[] {
  const map = new Map<number, TimeSlotState[]>();
  for (const slot of slots) {
    if (!map.has(slot.dayIndex)) map.set(slot.dayIndex, []);
    map.get(slot.dayIndex)!.push(slot);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, s]) => ({ dayIndex, slots: s.sort((a, b) => a.startMinute - b.startMinute) }));
}

// ========== スタイル ==========

const StyledForm = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .e-title {
    font-size: 1em;
    font-weight: 600;
    color: #222;
    padding-bottom: 4px;
    border-bottom: 1px solid #f0f0f0;
  }

  .e-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-field-label {
    font-size: 0.8em;
    color: #555;
    font-weight: 600;
  }

  .e-required {
    color: #e53935;
  }

  .e-slot-count {
    font-weight: 400;
    color: #999;
    margin-left: 4px;
  }

  .e-input {
    padding: 7px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9em;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-textarea {
    padding: 7px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9em;
    font-family: inherit;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  /* タグ */
  .e-tag-area {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 6px;
    min-height: 38px;
    cursor: text;

    &:focus-within {
      border-color: #1976d2;
    }
  }

  .e-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: #e3f2fd;
    color: #1565c0;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.82em;
    font-weight: 500;
  }

  .e-tag-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: #1565c0;
    padding: 0 2px;
    font-size: 0.9em;
    line-height: 1;

    &:hover {
      color: #c62828;
    }
  }

  .e-tag-input-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 100px;
  }

  .e-tag-input {
    border: none;
    outline: none;
    font-size: 0.85em;
    font-family: inherit;
    flex: 1;
    min-width: 80px;
  }

  .e-tag-add-btn {
    padding: 2px 8px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.78em;
    cursor: pointer;
    white-space: nowrap;
  }

  .e-tag-suggests {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .e-suggest-label {
    font-size: 0.75em;
    color: #aaa;
  }

  .e-suggest-btn {
    padding: 2px 8px;
    background: #f5f5f5;
    color: #555;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    font-size: 0.78em;
    cursor: pointer;

    &:hover {
      background: #e3f2fd;
      border-color: #90caf9;
      color: #1565c0;
    }
  }

  /* スキル */
  .e-skill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .e-skill-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border: 1px solid #ddd;
    border-radius: 16px;
    font-size: 0.82em;
    cursor: pointer;
    background: white;
    color: #555;

    input[type="checkbox"] {
      display: none;
    }

    &.is-selected {
      background: #e8f5e9;
      border-color: #4caf50;
      color: #2e7d32;
      font-weight: 600;
    }

    &:hover:not(.is-selected) {
      background: #f0f4ff;
      border-color: #90caf9;
    }
  }

  /* 時間帯スロット */
  .e-slot-days {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-slot-day {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-slot-day-header {
    display: flex;
    align-items: center;
  }

  .e-day-toggle {
    padding: 2px 10px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.78em;
    cursor: pointer;
    color: #555;

    &.is-all {
      background: #1976d2;
      border-color: #1976d2;
      color: white;
    }

    &:hover:not(.is-all) {
      background: #e3f2fd;
    }
  }

  .e-slot-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-slot-btn {
    padding: 3px 8px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.75em;
    cursor: pointer;
    color: #555;
    white-space: nowrap;

    &.is-selected {
      background: #e3f2fd;
      border-color: #90caf9;
      color: #1565c0;
      font-weight: 600;
    }

    &:hover:not(.is-selected) {
      background: #e8f5e9;
      border-color: #a5d6a7;
    }
  }

  /* アクション */
  .e-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }

  .e-btn {
    padding: 7px 18px;
    border: none;
    border-radius: 6px;
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

  .e-btn-save {
    background: #1976d2;
    color: white;

    &:hover:not(:disabled) {
      background: #1565c0;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
