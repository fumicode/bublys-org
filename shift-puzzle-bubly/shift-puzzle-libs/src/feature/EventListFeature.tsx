'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { Event } from '@bublys-org/shift-puzzle-model';
import {
  selectEvents,
  selectCurrentEventId,
  addEvent,
  setCurrentEventId,
} from '../slice/index.js';

interface EventListFeatureProps {
  onEventSelect: (eventId: string) => void;
}

/** イベント一覧・作成（Phase 1 / Issue #39） */
export const EventListFeature: React.FC<EventListFeatureProps> = ({ onEventSelect }) => {
  const dispatch = useAppDispatch();
  const events = useAppSelector(selectEvents);
  const currentEventId = useAppSelector(selectCurrentEventId);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    const event = Event.create({
      name: newName.trim(),
      description: '',
      startDate: newStartDate,
      endDate: newStartDate,
    });
    dispatch(addEvent(event.toJSON()));
    dispatch(setCurrentEventId(event.id));
    setCreating(false);
    setNewName('');
    onEventSelect(event.id);
  };

  return (
    <StyledWrapper>
      <div className="e-header">
        <span className="e-title">イベント一覧</span>
        <button className="e-create-btn" onClick={() => setCreating(true)}>
          ＋ 新規作成
        </button>
      </div>

      {creating && (
        <div className="e-create-form">
          <input
            className="e-input"
            placeholder="イベント名（例: 第72回大学祭）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            className="e-input"
            type="date"
            value={newStartDate}
            onChange={(e) => setNewStartDate(e.target.value)}
          />
          <div className="e-form-actions">
            <button className="e-btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
              作成
            </button>
            <button className="e-btn-cancel" onClick={() => { setCreating(false); setNewName(''); }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="e-list">
        {events.length === 0 && !creating && (
          <div className="e-empty">
            イベントがありません。「＋ 新規作成」から始めましょう。
          </div>
        )}
        {events.map((ev) => (
          <div
            key={ev.id}
            className={`e-event-card ${currentEventId === ev.id ? 'is-active' : ''}`}
            onClick={() => {
              dispatch(setCurrentEventId(ev.id));
              onEventSelect(ev.id);
            }}
          >
            <div className="e-event-name">{ev.name}</div>
            <div className="e-event-date">
              {ev.startDate}
              {ev.endDate !== ev.startDate && ` 〜 ${ev.endDate}`}
            </div>
          </div>
        ))}
      </div>
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
    padding: 12px 14px;
    background: white;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .e-title {
    font-size: 1.05em;
    font-weight: 700;
    color: #222;
  }

  .e-create-btn {
    margin-left: auto;
    padding: 5px 12px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;
  }

  .e-create-form {
    padding: 12px 14px;
    background: #f0f7ff;
    border-bottom: 1px solid #b3d4f5;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .e-input {
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
    outline: none;

    &:focus {
      border-color: #1976d2;
    }
  }

  .e-form-actions {
    display: flex;
    gap: 6px;
  }

  .e-btn-primary {
    padding: 5px 14px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .e-btn-cancel {
    padding: 5px 12px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    color: #555;
  }

  .e-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-empty {
    text-align: center;
    color: #aaa;
    font-size: 0.88em;
    padding: 32px 0;
  }

  .e-event-card {
    padding: 10px 12px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover {
      border-color: #90caf9;
      box-shadow: 0 1px 4px rgba(25, 118, 210, 0.1);
    }

    &.is-active {
      border-color: #1976d2;
      background: #f0f7ff;
    }
  }

  .e-event-name {
    font-weight: 600;
    font-size: 0.95em;
    color: #222;
  }

  .e-event-date {
    font-size: 0.8em;
    color: #888;
    margin-top: 2px;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
