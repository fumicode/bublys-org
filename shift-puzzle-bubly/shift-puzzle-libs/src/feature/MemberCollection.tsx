'use client';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { Member, type MemberState } from '@bublys-org/shift-puzzle-model';
import {
  selectMembersForEvent,
  selectEventById,
  selectTimeSlotsForEvent,
  selectFilteredMembersForEvent,
  selectMemberFilter,
  selectCurrentShiftPlanId,
  addMember,
  updateMember,
  deleteMember,
  setMemberFilter,
  resetMemberFilter,
} from '../slice/index.js';
import { MemberCard } from '../ui/index.js';
import { MemberForm } from '../ui/MemberCard/MemberForm.js';

interface MemberCollectionProps {
  eventId: string;
  /** F-4-1: メンバーカードタップで詳細バブルを開くコールバック */
  onMemberTap?: (memberId: string) => void;
}

type EditingState =
  | { mode: 'none' }
  | { mode: 'add' }
  | { mode: 'edit'; memberId: string };

/** F-1-1〜F-1-4 + F-5-1〜F-5-4: メンバー一覧＋CRUD＋フィルタリング（Redux連携） */
export const MemberCollection: React.FC<MemberCollectionProps> = ({ eventId, onMemberTap }) => {
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectMembersForEvent(eventId));
  const event = useAppSelector(selectEventById(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));
  const currentShiftPlanId = useAppSelector(selectCurrentShiftPlanId);
  const memberFilter = useAppSelector(selectMemberFilter);
  const filteredMembers = useAppSelector(
    selectFilteredMembersForEvent(eventId, currentShiftPlanId ?? undefined)
  );

  const [editing, setEditing] = useState<EditingState>({ mode: 'none' });
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const skillDefinitions = event?.state.skillDefinitions ?? [];

  // 全タグ一覧
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      for (const tag of m.state.tags) set.add(tag);
    }
    return Array.from(set).sort();
  }, [members]);

  // テキスト検索はローカル（高速性優先）
  const displayMembers = useMemo(() => {
    if (!searchText.trim()) return filteredMembers;
    const q = searchText.toLowerCase();
    return filteredMembers.filter((m) => m.state.name.toLowerCase().includes(q));
  }, [filteredMembers, searchText]);

  // フィルターが有効かどうか
  const isFiltered =
    !!memberFilter.availableAtSlotId ||
    memberFilter.requiredSkillIds.length > 0 ||
    memberFilter.tags.length > 0 ||
    !!memberFilter.assignmentStatus;

  const editingMember = editing.mode === 'edit'
    ? members.find((m) => m.state.id === editing.memberId)?.state
    : undefined;

  const handleSave = (data: Omit<MemberState, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>) => {
    if (editing.mode === 'add') {
      const member = Member.create({ ...data, eventId });
      dispatch(addMember(member.toJSON()));
    } else if (editing.mode === 'edit' && editingMember) {
      const updated = new Member({
        ...editingMember,
        ...data,
        updatedAt: new Date().toISOString(),
      });
      dispatch(updateMember(updated.toJSON()));
    }
    setEditing({ mode: 'none' });
  };

  const handleDelete = (memberId: string) => {
    if (window.confirm('このメンバーを削除しますか？')) {
      dispatch(deleteMember(memberId));
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <StyledWrapper>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-header-left">
          <span className="e-title">メンバー管理</span>
          <span className="e-count">{members.length}名</span>
          {isFiltered && (
            <span className="e-filtered-count">
              ({displayMembers.length}名表示中)
            </span>
          )}
        </div>
        <button
          className="e-add-btn"
          onClick={() => setEditing({ mode: 'add' })}
          disabled={editing.mode !== 'none'}
        >
          ＋ 追加
        </button>
      </div>

      {/* 検索＋フィルターバー */}
      {editing.mode === 'none' && (
        <div className="e-filter-bar">
          <div className="e-search-row">
            <input
              className="e-search"
              type="text"
              placeholder="名前で検索..."
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            />
            <button
              className={`e-filter-toggle ${filterOpen ? 'is-open' : ''} ${isFiltered ? 'is-active' : ''}`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              絞り込み{isFiltered ? ' ●' : ''}
            </button>
            {isFiltered && (
              <button
                className="e-reset-btn"
                onClick={() => dispatch(resetMemberFilter())}
                title="フィルターをリセット"
              >
                ×
              </button>
            )}
          </div>

          {/* F-5: 詳細フィルターパネル */}
          {filterOpen && (
            <div className="e-filter-panel">

              {/* F-5-3: タグフィルター */}
              {allTags.length > 0 && (
                <div className="e-filter-section">
                  <div className="e-filter-label">タグ</div>
                  <div className="e-chip-row">
                    {allTags.map((tag) => {
                      const active = memberFilter.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          className={`e-chip ${active ? 'is-active' : ''}`}
                          onClick={() => {
                            const next = active
                              ? memberFilter.tags.filter((t) => t !== tag)
                              : [...memberFilter.tags, tag];
                            dispatch(setMemberFilter({ tags: next }));
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* F-5-1: 時間帯フィルター */}
              {timeSlots.length > 0 && (
                <div className="e-filter-section">
                  <div className="e-filter-label">参加可能な時間帯</div>
                  <select
                    className="e-select"
                    value={memberFilter.availableAtSlotId ?? ''}
                    onChange={(e) =>
                      dispatch(setMemberFilter({ availableAtSlotId: e.target.value || undefined }))
                    }
                  >
                    <option value="">すべての時間帯</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {formatTime(slot.startMinute)}〜{formatTime(slot.startMinute + slot.durationMinutes)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* F-5-2: スキルフィルター */}
              {skillDefinitions.length > 0 && (
                <div className="e-filter-section">
                  <div className="e-filter-label">必要スキル（AND）</div>
                  <div className="e-chip-row">
                    {skillDefinitions.map((skill) => {
                      const active = memberFilter.requiredSkillIds.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          className={`e-chip ${active ? 'is-active' : ''}`}
                          onClick={() => {
                            const next = active
                              ? memberFilter.requiredSkillIds.filter((id) => id !== skill.id)
                              : [...memberFilter.requiredSkillIds, skill.id];
                            dispatch(setMemberFilter({ requiredSkillIds: next }));
                          }}
                        >
                          {skill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* F-5-4: 配置状況フィルター */}
              {currentShiftPlanId && (
                <div className="e-filter-section">
                  <div className="e-filter-label">配置状況</div>
                  <div className="e-chip-row">
                    {(
                      [
                        { value: undefined, label: 'すべて' },
                        { value: 'unassigned', label: '未配置' },
                        { value: 'assigned', label: '配置済み' },
                        { value: 'over_assigned', label: '過配置' },
                      ] as const
                    ).map(({ value, label }) => (
                      <button
                        key={label}
                        className={`e-chip ${memberFilter.assignmentStatus === value ? 'is-active' : ''}`}
                        onClick={() => dispatch(setMemberFilter({ assignmentStatus: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* フォーム（追加・編集） */}
      {editing.mode !== 'none' && (
        <div className="e-form-area">
          <MemberForm
            initial={editingMember}
            eventId={eventId}
            skillDefinitions={skillDefinitions}
            timeSlots={timeSlots}
            existingTags={allTags}
            onSave={handleSave}
            onCancel={() => setEditing({ mode: 'none' })}
          />
        </div>
      )}

      {/* メンバー一覧 */}
      {editing.mode === 'none' && (
        <div className="e-list">
          {displayMembers.length === 0 ? (
            <div className="e-empty">
              {members.length === 0
                ? 'メンバーがいません。「＋ 追加」から追加してください。'
                : '条件に合うメンバーが見つかりません。'}
            </div>
          ) : (
            displayMembers.map((m) => (
              <MemberCard
                key={m.state.id}
                member={m.state}
                skillDefinitions={skillDefinitions}
                timeSlots={timeSlots}
                onEdit={(id) => setEditing({ mode: 'edit', memberId: id })}
                onDelete={handleDelete}
                onTap={onMemberTap}
                dragUrl={`shift-puzzle/events/${eventId}/members/${m.state.id}`}
              />
            ))
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fafafa;

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: white;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    gap: 8px;
  }

  .e-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .e-title {
    font-weight: 600;
    font-size: 0.95em;
    color: #222;
  }

  .e-count {
    background: #f5f5f5;
    color: #666;
    padding: 1px 8px;
    border-radius: 12px;
    font-size: 0.78em;
  }

  .e-filtered-count {
    font-size: 0.78em;
    color: #1976d2;
    font-weight: 500;
  }

  .e-add-btn {
    padding: 5px 12px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85em;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;

    &:hover:not(:disabled) { background: #1565c0; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .e-filter-bar {
    padding: 8px 14px;
    background: white;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .e-search-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .e-search {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.88em;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-filter-toggle {
    padding: 5px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    font-size: 0.82em;
    cursor: pointer;
    color: #555;
    white-space: nowrap;

    &.is-open { background: #e3f2fd; border-color: #90caf9; }
    &.is-active { color: #1976d2; font-weight: 600; }
  }

  .e-reset-btn {
    padding: 4px 8px;
    border: none;
    background: #fce4e4;
    color: #c62828;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    line-height: 1;
    font-weight: 700;
  }

  .e-filter-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px 0 4px;
    border-top: 1px solid #f0f0f0;
  }

  .e-filter-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-filter-label {
    font-size: 0.72em;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .e-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-chip {
    padding: 3px 10px;
    border: 1px solid #ddd;
    border-radius: 12px;
    background: white;
    font-size: 0.8em;
    cursor: pointer;
    color: #555;

    &.is-active {
      background: #1976d2;
      border-color: #1976d2;
      color: white;
    }

    &:hover:not(.is-active) {
      background: #e3f2fd;
      border-color: #90caf9;
    }
  }

  .e-select {
    padding: 5px 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.85em;
    font-family: inherit;
    background: white;
    cursor: pointer;

    &:focus { outline: none; border-color: #1976d2; }
  }

  .e-form-area {
    flex-shrink: 0;
    padding: 12px;
    background: #f9fafb;
    border-bottom: 1px solid #eee;
    overflow-y: auto;
    max-height: 70vh;
  }

  .e-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 0.9em;
    text-align: center;
    padding: 24px;
  }
`;
