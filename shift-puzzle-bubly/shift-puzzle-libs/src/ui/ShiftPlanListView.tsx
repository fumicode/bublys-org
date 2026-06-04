'use client';

import { FC, useState, useEffect } from 'react';
import styled from 'styled-components';
import { ShiftPlan } from '../domain/index.js';
import { UrledPlace } from '@bublys-org/bubbles-ui';

type FestivalDay = { label: string; date: string };

export type ShiftPlanListViewProps = {
  plans: readonly ShiftPlan[];
  onCreate: (name: string, date: string, startTime: string, endTime: string) => void;
  onOpen: (planId: string) => void;
  onDelete?: (planId: string) => void;
  /** カードを UrledPlace でラップするための URL ビルダー（LinkBubble 曲線の起点に使用） */
  buildPlanUrl?: (planId: string) => string;
  /** 技大祭日程リスト（提供時は日程セレクトを表示し日付を自動設定） */
  festivalDays?: readonly FestivalDay[];
};

export const ShiftPlanListView: FC<ShiftPlanListViewProps> = ({ plans, onCreate, onOpen, onDelete, buildPlanUrl, festivalDays }) => {
  const [name, setName] = useState('');
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

  // 技大祭日程が渡された場合は先頭（1日目）をデフォルト選択
  useEffect(() => {
    if (festivalDays && festivalDays.length > 0 && !selectedDayLabel) {
      setSelectedDayLabel(festivalDays[0].label);
      setDate(festivalDays[0].date);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festivalDays]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || !date) return;
    onCreate(trimmed, date, startTime, endTime);
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
        {festivalDays && festivalDays.length > 0 && (
          <div className="sp-day-row">
            <label className="sp-field-label">日程</label>
            <select
              value={selectedDayLabel}
              onChange={(e) => {
                const label = e.target.value;
                setSelectedDayLabel(label);
                const day = festivalDays.find((d) => d.label === label);
                if (day) setDate(day.date);
              }}
              className="sp-day-select"
            >
              {festivalDays.map((d) => (
                <option key={d.label} value={d.label}>
                  {d.label}（{d.date}）
                </option>
              ))}
              <option value="">カスタム日付</option>
            </select>
          </div>
        )}
        <div className="sp-date-row">
          <label className="sp-field-label">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedDayLabel('');
            }}
            className="sp-date-input"
            required
          />
        </div>
        <div className="sp-time-row">
          <label className="sp-field-label">時間</label>
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
            disabled={!name.trim() || !date}
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
              <UrledPlace key={plan.id} url={buildPlanUrl ? buildPlanUrl(plan.id) : ''}>
                <div className="sp-plan-item" onClick={() => onOpen(plan.id)}>
                  <div className="sp-plan-info">
                    <span className="sp-plan-name">{plan.name}</span>
                    <span className="sp-plan-meta">
                      <span className="sp-plan-date">{plan.date || '日付未設定'}</span>
                      {ts && (
                        <span className="sp-plan-time">{ts.startTime}〜{ts.endTime}</span>
                      )}
                    </span>
                  </div>
                  {onDelete && (
                    <button
                      type="button"
                      className="sp-delete-btn"
                      onClick={(e) => { e.stopPropagation(); onDelete?.(plan.id); }}
                      title="削除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </UrledPlace>
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

  .sp-day-row,
  .sp-date-row,
  .sp-time-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-day-select {
    flex: 1;
    padding: 5px 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.88em;
    outline: none;
    background: #fff;

    &:focus {
      border-color: #1976d2;
    }
  }

  .sp-field-label {
    font-size: 0.8em;
    color: #666;
    flex-shrink: 0;
    width: 2.4em;
    text-align: right;
  }

  .sp-date-input {
    flex: 1;
    padding: 5px 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.88em;
    outline: none;

    &:focus {
      border-color: #1976d2;
    }
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
    cursor: pointer;
    transition: box-shadow 0.1s, background 0.1s;

    &:hover {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      background: #f5f9ff;
    }

    &:hover .sp-delete-btn {
      opacity: 1;
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

  .sp-plan-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sp-plan-date {
    font-size: 0.8em;
    color: #1976d2;
    font-weight: 500;
  }

  .sp-plan-time {
    font-size: 0.8em;
    color: #757575;
  }

  .sp-delete-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    color: #9e9e9e;
    font-size: 0.8em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: background 0.1s, color 0.1s, border-color 0.1s, opacity 0.1s;

    &:hover {
      background: #ffebee;
      color: #c62828;
      border-color: #ef9a9a;
    }
  }
`;
