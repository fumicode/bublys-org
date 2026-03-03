'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { ShiftPlan } from '@bublys-org/shift-puzzle-model';
import {
  selectShiftPlansForEvent,
  selectCurrentShiftPlanId,
  addShiftPlan,
  deleteShiftPlan,
  setCurrentShiftPlanId,
} from '../slice/index.js';

interface ShiftPlanListFeatureProps {
  eventId: string;
  onPlanSelect: (planId: string) => void;
}

/** シフト案一覧・作成・コピー（Phase 1 / Issue #39） */
export const ShiftPlanListFeature: React.FC<ShiftPlanListFeatureProps> = ({
  eventId,
  onPlanSelect,
}) => {
  const dispatch = useAppDispatch();
  const shiftPlans = useAppSelector(selectShiftPlansForEvent(eventId));
  const currentPlanId = useAppSelector(selectCurrentShiftPlanId);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [forkSourceId, setForkSourceId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    let plan: ShiftPlan;
    if (forkSourceId) {
      const source = shiftPlans.find((p) => p.id === forkSourceId);
      plan = source
        ? source.fork(newName.trim(), newScenario.trim())
        : ShiftPlan.create({ name: newName.trim(), eventId, scenarioLabel: newScenario.trim() });
      // forkはeventIdが引き継がれないので補正
      plan = new ShiftPlan({ ...plan.state, eventId });
    } else {
      plan = ShiftPlan.create({ name: newName.trim(), eventId, scenarioLabel: newScenario.trim() });
    }
    dispatch(addShiftPlan(plan.toJSON()));
    dispatch(setCurrentShiftPlanId(plan.id));
    setCreating(false);
    setNewName('');
    setNewScenario('');
    setForkSourceId(null);
    onPlanSelect(plan.id);
  };

  const handleStartFork = (sourceId: string) => {
    const source = shiftPlans.find((p) => p.id === sourceId);
    setForkSourceId(sourceId);
    setNewName(source ? `${source.name} (コピー)` : '');
    setNewScenario('');
    setCreating(true);
  };

  return (
    <StyledWrapper>
      <div className="e-header">
        <span className="e-title">シフト案一覧</span>
        <button className="e-create-btn" onClick={() => { setForkSourceId(null); setNewName(''); setCreating(true); }}>
          ＋ 新規作成
        </button>
      </div>

      {creating && (
        <div className="e-create-form">
          {forkSourceId && (
            <div className="e-fork-note">
              「{shiftPlans.find((p) => p.id === forkSourceId)?.name}」をコピー
            </div>
          )}
          <input
            className="e-input"
            placeholder="シフト案名（例: シフト案 A）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            className="e-input"
            placeholder="シナリオラベル（例: 晴天用・任意）"
            value={newScenario}
            onChange={(e) => setNewScenario(e.target.value)}
          />
          <div className="e-form-actions">
            <button className="e-btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
              {forkSourceId ? 'コピー作成' : '作成'}
            </button>
            <button className="e-btn-cancel" onClick={() => { setCreating(false); setForkSourceId(null); }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="e-list">
        {shiftPlans.length === 0 && !creating && (
          <div className="e-empty">シフト案がありません。「＋ 新規作成」から始めましょう。</div>
        )}
        {shiftPlans.map((plan) => (
          <div
            key={plan.id}
            className={`e-plan-card ${currentPlanId === plan.id ? 'is-active' : ''}`}
          >
            <div
              className="e-plan-main"
              onClick={() => {
                dispatch(setCurrentShiftPlanId(plan.id));
                onPlanSelect(plan.id);
              }}
            >
              <div className="e-plan-name">{plan.name}</div>
              {plan.scenarioLabel && (
                <span className="e-scenario-badge">{plan.scenarioLabel}</span>
              )}
              <div className="e-plan-meta">
                配置 {plan.state.assignments.length}件
              </div>
            </div>
            <div className="e-plan-actions">
              <button
                className="e-fork-btn"
                onClick={() => handleStartFork(plan.id)}
                title="コピーして新しいシフト案を作成"
              >
                分岐
              </button>
              <button
                className="e-delete-btn"
                onClick={() => {
                  if (window.confirm(`「${plan.name}」を削除しますか？`)) {
                    dispatch(deleteShiftPlan(plan.id));
                  }
                }}
                title="削除"
              >
                ×
              </button>
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

  .e-fork-note {
    font-size: 0.82em;
    color: #1565c0;
    background: #e3f2fd;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .e-input {
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
    outline: none;
    &:focus { border-color: #1976d2; }
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
    &:disabled { opacity: 0.5; cursor: not-allowed; }
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
    gap: 5px;
  }

  .e-empty {
    text-align: center;
    color: #aaa;
    font-size: 0.88em;
    padding: 24px 0;
  }

  .e-plan-card {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.15s;

    &.is-active {
      border-color: #1976d2;
      background: #f0f7ff;
    }
  }

  .e-plan-main {
    flex: 1;
    padding: 9px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 3px;

    &:hover .e-plan-name { color: #1976d2; }
  }

  .e-plan-name {
    font-weight: 600;
    font-size: 0.92em;
    color: #222;
  }

  .e-scenario-badge {
    align-self: flex-start;
    background: #e8eaf6;
    color: #3949ab;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 0.76em;
  }

  .e-plan-meta {
    font-size: 0.78em;
    color: #888;
  }

  .e-plan-actions {
    display: flex;
    gap: 2px;
    padding: 0 6px;
  }

  .e-fork-btn {
    padding: 4px 8px;
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #a5d6a7;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.76em;
    font-weight: 600;

    &:hover { background: #c8e6c9; }
  }

  .e-delete-btn {
    background: none;
    border: none;
    color: #bbb;
    cursor: pointer;
    font-size: 1.1em;
    padding: 2px 6px;
    border-radius: 3px;
    line-height: 1;

    &:hover { background: #fce4e4; color: #c62828; }
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
