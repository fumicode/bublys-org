'use client';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { Member, type MemberState } from '@bublys-org/shift-puzzle-model';
import {
  selectMembersForEvent,
  selectEventById,
  selectTimeSlotsForEvent,
  addMember,
  updateMember,
  deleteMember,
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

/** F-1-1〜F-1-4: メンバー一覧＋CRUD（Redux連携） */
export const MemberCollection: React.FC<MemberCollectionProps> = ({ eventId, onMemberTap }) => {
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectMembersForEvent(eventId));
  const event = useAppSelector(selectEventById(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));
  const [editing, setEditing] = useState<EditingState>({ mode: 'none' });
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const skillDefinitions = event?.state.skillDefinitions ?? [];

  // 全タグ一覧（サジェスト用）
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      for (const tag of m.state.tags) set.add(tag);
    }
    return Array.from(set).sort();
  }, [members]);

  // フィルター済みメンバー
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (tagFilter && !m.state.tags.includes(tagFilter)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!m.state.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [members, tagFilter, searchText]);

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

  return (
    <StyledWrapper>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-header-left">
          <span className="e-title">メンバー管理</span>
          <span className="e-count">{members.length}名</span>
        </div>
        <button
          className="e-add-btn"
          onClick={() => setEditing({ mode: 'add' })}
          disabled={editing.mode !== 'none'}
        >
          ＋ メンバーを追加
        </button>
      </div>

      {/* 検索・タグフィルター */}
      {editing.mode === 'none' && (
        <div className="e-filter-bar">
          <input
            className="e-search"
            type="text"
            placeholder="名前で検索..."
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
          />
          {allTags.length > 0 && (
            <div className="e-tag-filters">
              <button
                className={`e-tag-filter-btn ${tagFilter === null ? 'is-active' : ''}`}
                onClick={() => setTagFilter(null)}
              >
                すべて
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`e-tag-filter-btn ${tagFilter === tag ? 'is-active' : ''}`}
                  onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                >
                  {tag}
                </button>
              ))}
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
          {filteredMembers.length === 0 ? (
            <div className="e-empty">
              {members.length === 0
                ? 'メンバーがいません。「＋ メンバーを追加」から追加してください。'
                : '条件に合うメンバーが見つかりません。'}
            </div>
          ) : (
            filteredMembers.map((m) => (
              <MemberCard
                key={m.state.id}
                member={m.state}
                skillDefinitions={skillDefinitions}
                timeSlots={timeSlots}
                onEdit={(id) => setEditing({ mode: 'edit', memberId: id })}
                onDelete={handleDelete}
                onTap={onMemberTap}
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
    gap: 8px;
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

  .e-add-btn {
    padding: 6px 14px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85em;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: #1565c0;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
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

  .e-search {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.88em;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .e-tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-tag-filter-btn {
    padding: 2px 10px;
    border: 1px solid #ddd;
    border-radius: 12px;
    background: white;
    font-size: 0.78em;
    cursor: pointer;
    color: #666;

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
