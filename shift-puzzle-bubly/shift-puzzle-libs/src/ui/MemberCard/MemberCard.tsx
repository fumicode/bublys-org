'use client';
import React from 'react';
import styled from 'styled-components';
import { setDragPayload, getDragType } from '@bublys-org/bubbles-ui';
import type {
  MemberState,
  TimeSlotState,
  SkillDefinitionState,
} from '@bublys-org/shift-puzzle-model';

export interface MemberCardProps {
  member: MemberState;
  skillDefinitions?: ReadonlyArray<SkillDefinitionState>;
  timeSlots?: ReadonlyArray<TimeSlotState>;
  onEdit?: (memberId: string) => void;
  onDelete?: (memberId: string) => void;
  /** F-4-1: タップで詳細バブルを開く */
  onTap?: (memberId: string) => void;
  /** F-4-3: ドラッグ&ドロップ用URL（設定するとカードがドラッグ可能になる） */
  dragUrl?: string;
}

/** F-1-1: メンバー情報の表示カード */
export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  skillDefinitions = [],
  timeSlots = [],
  onEdit,
  onDelete,
  onTap,
  dragUrl,
}) => {
  const skillLabels = member.skills
    .map((skillId) => skillDefinitions.find((d) => d.id === skillId)?.label ?? skillId)
    .filter(Boolean);

  const availableCount = member.availableSlotIds.length;
  const totalCount = timeSlots.length;

  const handleClick = () => {
    onTap?.(member.id);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragUrl) return;
    setDragPayload(e, {
      type: getDragType('Member'),
      url: dragUrl,
      objectId: member.id,
      label: member.name,
    });
  };

  return (
    <StyledCard
      onClick={onTap ? handleClick : undefined}
      draggable={!!dragUrl}
      onDragStart={dragUrl ? handleDragStart : undefined}
      style={{
        cursor: dragUrl ? 'grab' : onTap ? 'pointer' : undefined,
      }}
    >
      <div className="e-header">
        <div className="e-name">{member.name}</div>
        <div className="e-actions">
          {onEdit && (
            <button className="e-btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(member.id); }} title="編集">
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              className="e-btn-icon e-btn-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(member.id); }}
              title="削除"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* F-1-4: タグ */}
      {member.tags.length > 0 && (
        <div className="e-tags">
          {member.tags.map((tag) => (
            <span key={tag} className="e-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* F-1-2: スキル */}
      {skillLabels.length > 0 && (
        <div className="e-skills">
          {skillLabels.map((label) => (
            <span key={label} className="e-skill-badge">
              ✓ {label}
            </span>
          ))}
        </div>
      )}

      {/* F-1-3: 参加可能時間帯サマリー */}
      {totalCount > 0 && (
        <div className="e-availability">
          <span className={`e-avail-bar-wrap`}>
            <span
              className="e-avail-bar"
              style={{ width: `${(availableCount / totalCount) * 100}%` }}
            />
          </span>
          <span className="e-avail-text">
            {availableCount}/{totalCount} 時間帯参加可
          </span>
        </div>
      )}

      {/* メモ */}
      {member.memo && (
        <div className="e-memo" title={member.memo}>
          📝 {member.memo}
        </div>
      )}
    </StyledCard>
  );
};

const StyledCard = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #bdbdbd;
  }

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .e-name {
    font-size: 1em;
    font-weight: 600;
    color: #222;
  }

  .e-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  &:hover .e-actions {
    opacity: 1;
  }

  .e-btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 3px 5px;
    border-radius: 4px;
    font-size: 0.9em;

    &:hover {
      background: #f5f5f5;
    }
  }

  .e-btn-delete:hover {
    background: #fce4e4;
  }

  .e-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-tag {
    background: #e3f2fd;
    color: #1565c0;
    padding: 1px 8px;
    border-radius: 12px;
    font-size: 0.78em;
    font-weight: 500;
  }

  .e-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .e-skill-badge {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 1px 8px;
    border-radius: 4px;
    font-size: 0.76em;
    font-weight: 500;
  }

  .e-availability {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-avail-bar-wrap {
    flex: 1;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
    max-width: 80px;
  }

  .e-avail-bar {
    display: block;
    height: 100%;
    background: #4caf50;
    border-radius: 2px;
    transition: width 0.3s;
  }

  .e-avail-text {
    font-size: 0.76em;
    color: #888;
  }

  .e-memo {
    font-size: 0.78em;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
