'use client';
import React from 'react';
import styled from 'styled-components';
import { useAppSelector } from '@bublys-org/state-management';
import {
  selectEventById,
  selectMembersForEvent,
  selectRolesForEvent,
  selectShiftPlansForEvent,
} from '../slice/index.js';

interface EventDetailFeatureProps {
  eventId: string;
  onOpenMembers: () => void;
  onOpenRoles: () => void;
  onOpenShiftPlans: () => void;
}

/** イベント詳細（Phase 1 / Issue #39） */
export const EventDetailFeature: React.FC<EventDetailFeatureProps> = ({
  eventId,
  onOpenMembers,
  onOpenRoles,
  onOpenShiftPlans,
}) => {
  const event = useAppSelector(selectEventById(eventId));
  const members = useAppSelector(selectMembersForEvent(eventId));
  const roles = useAppSelector(selectRolesForEvent(eventId));
  const shiftPlans = useAppSelector(selectShiftPlansForEvent(eventId));

  if (!event) {
    return (
      <div style={{ padding: 24, color: '#888', textAlign: 'center' }}>
        イベントが見つかりません（ID: {eventId}）
      </div>
    );
  }

  return (
    <StyledWrapper>
      <div className="e-header">
        <div className="e-event-name">{event.name}</div>
        <div className="e-event-date">
          {event.startDate}
          {event.endDate !== event.startDate && ` 〜 ${event.endDate}`}
        </div>
        {event.description && (
          <div className="e-event-desc">{event.description}</div>
        )}
      </div>

      <div className="e-nav-list">
        <button className="e-nav-card" onClick={onOpenMembers}>
          <span className="e-nav-icon">👥</span>
          <span className="e-nav-label">メンバー</span>
          <span className="e-nav-count">{members.length}人</span>
          <span className="e-nav-arrow">›</span>
        </button>

        <button className="e-nav-card" onClick={onOpenRoles}>
          <span className="e-nav-icon">🏷️</span>
          <span className="e-nav-label">役割</span>
          <span className="e-nav-count">{roles.length}役割</span>
          <span className="e-nav-arrow">›</span>
        </button>

        <button className="e-nav-card" onClick={onOpenShiftPlans}>
          <span className="e-nav-icon">📅</span>
          <span className="e-nav-label">シフト案</span>
          <span className="e-nav-count">{shiftPlans.length}案</span>
          <span className="e-nav-arrow">›</span>
        </button>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafafa;

  .e-header {
    padding: 14px 16px;
    background: white;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .e-event-name {
    font-size: 1.1em;
    font-weight: 700;
    color: #222;
  }

  .e-event-date {
    font-size: 0.82em;
    color: #888;
    margin-top: 3px;
  }

  .e-event-desc {
    font-size: 0.85em;
    color: #666;
    margin-top: 6px;
    line-height: 1.5;
  }

  .e-nav-list {
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-nav-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;

    &:hover {
      border-color: #90caf9;
      box-shadow: 0 1px 4px rgba(25, 118, 210, 0.1);
    }
  }

  .e-nav-icon {
    font-size: 1.2em;
  }

  .e-nav-label {
    font-weight: 600;
    font-size: 0.95em;
    color: #333;
    flex: 1;
  }

  .e-nav-count {
    font-size: 0.85em;
    color: #888;
  }

  .e-nav-arrow {
    font-size: 1.1em;
    color: #bbb;
    margin-left: 2px;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
