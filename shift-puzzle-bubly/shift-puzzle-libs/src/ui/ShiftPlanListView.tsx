'use client';

import { FC, useState } from 'react';
import styled from 'styled-components';
import { ShiftPlan } from '../domain/index.js';

export type ShiftPlanListViewProps = {
  plans: readonly ShiftPlan[];
  onCreate: (name: string, startTime: string, endTime: string) => void;
  onOpen: (planId: string) => void;
};

export const ShiftPlanListView: FC<ShiftPlanListViewProps> = ({ plans, onCreate, onOpen }) => {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, startTime, endTime);
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  return (
    <StyledContainer>
      <div className="sp-header">
        <h2 className="sp-title">シフト表リスト</h2>
      </div>

      <div className="sp-create-form">
        <input
          type="text"
          placeholder="シフト表の名前（例：準備日・晴れ）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="sp-name-input"
        />
        <div className="sp-time-row">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="sp-time-input"
          />
          <span className="sp-time-sep">〜</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="sp-time-input"
          />
          <button
            type="button"
            className="sp-create-btn"
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            作成
          </button>
        </div>
      </div>

      <div className="sp-plan-list">
        {plans.length === 0 ? (
          <div className="sp-empty">シフト表がまだありません</div>
        ) : (
          plans.map((plan) => {
            const ts = plan.timeSchedules[0];
            return (
              <div key={plan.id} className="sp-plan-item">
                <div className="sp-plan-info">
                  <span className="sp-plan-name">{plan.name}</span>
                  {ts && (
                    <span className="sp-plan-time">{ts.startTime}〜{ts.endTime}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="sp-open-btn"
                  onClick={() => onOpen(plan.id)}
                >
                  開く
                </button>
              </div>
            );
          })
        )}
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.9em;

  .sp-header {
    padding: 12px 14px 4px;
    flex-shrink: 0;
  }

  .sp-title {
    margin: 0;
    font-size: 1em;
    font-weight: 700;
    color: #333;
  }

  .sp-create-form {
    padding: 8px 14px 10px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sp-name-input {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.9em;
    box-sizing: border-box;
    outline: none;

    &:focus {
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
    }
  }

  .sp-time-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-time-input {
    padding: 5px 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.88em;
    outline: none;

    &:focus {
      border-color: #1976d2;
    }
  }

  .sp-time-sep {
    color: #666;
    font-size: 0.9em;
  }

  .sp-create-btn {
    margin-left: auto;
    padding: 5px 14px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.88em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.1s;

    &:hover:not(:disabled) {
      background: #1565c0;
    }

    &:disabled {
      background: #bdbdbd;
      cursor: default;
    }
  }

  .sp-plan-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sp-empty {
    color: #aaa;
    font-size: 0.9em;
    text-align: center;
    padding: 24px 0;
  }

  .sp-plan-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    transition: box-shadow 0.1s;

    &:hover {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
  }

  .sp-plan-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .sp-plan-name {
    font-weight: 600;
    color: #222;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-plan-time {
    font-size: 0.8em;
    color: #757575;
  }

  .sp-open-btn {
    flex-shrink: 0;
    padding: 4px 12px;
    border: 1px solid #1976d2;
    border-radius: 6px;
    background: #fff;
    color: #1976d2;
    font-size: 0.85em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.1s;

    &:hover {
      background: #e3f2fd;
    }
  }
`;
