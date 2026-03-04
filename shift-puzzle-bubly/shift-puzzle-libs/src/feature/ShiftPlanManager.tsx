'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { ShiftPlan } from '@bublys-org/shift-puzzle-model';
import {
  selectShiftPlansForEvent,
  selectCurrentShiftPlanId,
  addShiftPlan,
  updateShiftPlan,
  deleteShiftPlan,
  setCurrentShiftPlanId,
} from '../slice/index.js';

interface ShiftPlanManagerProps {
  eventId: string;
  onPlanSelect: (planId: string) => void;
}

type EditingPlan = {
  id: string;
  name: string;
  scenarioLabel: string;
};

/**
 * F-6-1〜F-6-3: シフト案管理（Issue #41）
 * - 複数案の並行管理・切り替え
 * - コピー（配置・理由ごと）分岐
 * - 名前・シナリオラベルのインライン編集
 */
export const ShiftPlanManager: React.FC<ShiftPlanManagerProps> = ({
  eventId,
  onPlanSelect,
}) => {
  const dispatch = useAppDispatch();
  const shiftPlans = useAppSelector(selectShiftPlansForEvent(eventId));
  const currentPlanId = useAppSelector(selectCurrentShiftPlanId);

  // 新規作成フォーム
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [forkSourceId, setForkSourceId] = useState<string | null>(null);

  // インライン編集
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);

  // ── 新規作成 ──────────────────────────────────────
  const handleCreate = () => {
    if (!newName.trim()) return;
    let plan: ShiftPlan;

    if (forkSourceId) {
      const source = shiftPlans.find((p) => p.id === forkSourceId);
      const forked = source
        ? source.fork(newName.trim(), newScenario.trim())
        : ShiftPlan.create({ name: newName.trim(), eventId, scenarioLabel: newScenario.trim() });
      // fork は eventId を引き継がないため補正
      plan = new ShiftPlan({ ...forked.state, eventId });
    } else {
      plan = ShiftPlan.create({
        name: newName.trim(),
        eventId,
        scenarioLabel: newScenario.trim(),
      });
    }

    dispatch(addShiftPlan(plan.toJSON()));
    dispatch(setCurrentShiftPlanId(plan.id));
    resetCreateForm();
    onPlanSelect(plan.id);
  };

  const resetCreateForm = () => {
    setCreating(false);
    setNewName('');
    setNewScenario('');
    setForkSourceId(null);
  };

  const startFork = (sourceId: string) => {
    const source = shiftPlans.find((p) => p.id === sourceId);
    setForkSourceId(sourceId);
    setNewName(source ? `${source.name}（コピー）` : '');
    setNewScenario('');
    setCreating(true);
  };

  // ── インライン編集 ────────────────────────────────
  const startEdit = (plan: ShiftPlan) => {
    setEditingPlan({
      id: plan.id,
      name: plan.name,
      scenarioLabel: plan.scenarioLabel,
    });
  };

  const commitEdit = () => {
    if (!editingPlan) return;
    const source = shiftPlans.find((p) => p.id === editingPlan.id);
    if (!source) return;
    const updated = source
      .withName(editingPlan.name.trim() || source.name)
      .withScenarioLabel(editingPlan.scenarioLabel.trim());
    dispatch(updateShiftPlan(updated.toJSON()));
    setEditingPlan(null);
  };

  // ── 削除 ─────────────────────────────────────────
  const handleDelete = (plan: ShiftPlan) => {
    if (!window.confirm(`「${plan.name}」を削除しますか？\n配置データも全て失われます。`)) return;
    dispatch(deleteShiftPlan(plan.id));
  };

  return (
    <StyledWrapper>
      {/* ヘッダー */}
      <div className="e-header">
        <span className="e-title">シフト案管理</span>
        <span className="e-count">{shiftPlans.length}案</span>
        <button
          className="e-create-btn"
          onClick={() => { setForkSourceId(null); setNewName(''); setNewScenario(''); setCreating(true); }}
        >
          ＋ 新規作成
        </button>
      </div>

      {/* 新規作成フォーム */}
      {creating && (
        <div className="e-create-form">
          {forkSourceId && (
            <div className="e-fork-note">
              「{shiftPlans.find((p) => p.id === forkSourceId)?.name}」をコピーして作成
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
            placeholder="シナリオラベル（例: 晴天用）任意"
            value={newScenario}
            onChange={(e) => setNewScenario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="e-form-actions">
            <button
              className="e-btn-primary"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              {forkSourceId ? '分岐して作成' : '作成'}
            </button>
            <button className="e-btn-cancel" onClick={resetCreateForm}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* シフト案リスト */}
      <div className="e-list">
        {shiftPlans.length === 0 && !creating && (
          <div className="e-empty">
            シフト案がありません。「＋ 新規作成」から作成してください。
          </div>
        )}

        {shiftPlans.map((plan) => {
          const isActive = plan.id === currentPlanId;
          const isEditing = editingPlan?.id === plan.id;

          return (
            <div key={plan.id} className={`e-plan-card ${isActive ? 'is-active' : ''}`}>
              {isEditing ? (
                /* インライン編集モード */
                <div className="e-edit-form">
                  <input
                    className="e-input"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="シフト案名"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  />
                  <input
                    className="e-input e-input--scenario"
                    value={editingPlan.scenarioLabel}
                    onChange={(e) => setEditingPlan({ ...editingPlan, scenarioLabel: e.target.value })}
                    placeholder="シナリオラベル（例: 晴天用）任意"
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  />
                  <div className="e-form-actions">
                    <button className="e-btn-primary" onClick={commitEdit}>保存</button>
                    <button className="e-btn-cancel" onClick={() => setEditingPlan(null)}>キャンセル</button>
                  </div>
                </div>
              ) : (
                /* 通常表示モード */
                <>
                  <div
                    className="e-plan-main"
                    onClick={() => {
                      dispatch(setCurrentShiftPlanId(plan.id));
                      onPlanSelect(plan.id);
                    }}
                  >
                    <div className="e-plan-header">
                      {isActive && <span className="e-active-dot" />}
                      <span className="e-plan-name">{plan.name}</span>
                    </div>
                    {plan.scenarioLabel && (
                      <span className="e-scenario-badge">{plan.scenarioLabel}</span>
                    )}
                    <div className="e-plan-meta">
                      配置 {plan.state.assignments.length}件
                    </div>
                  </div>

                  <div className="e-plan-actions">
                    <button
                      className="e-action-btn e-action-btn--edit"
                      onClick={() => startEdit(plan)}
                      title="名前・ラベルを編集"
                    >
                      編集
                    </button>
                    <button
                      className="e-action-btn e-action-btn--fork"
                      onClick={() => startFork(plan.id)}
                      title="この案をコピーして分岐"
                    >
                      分岐
                    </button>
                    <button
                      className="e-action-btn e-action-btn--delete"
                      onClick={() => handleDelete(plan)}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

// ── スタイル ──────────────────────────────────────────

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fafafa;

  .e-header {
    display: flex;
    align-items: center;
    gap: 6px;
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

  .e-count {
    background: #f5f5f5;
    color: #666;
    padding: 1px 8px;
    border-radius: 12px;
    font-size: 0.78em;
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

    &:hover { background: #1565c0; }
  }

  .e-create-form,
  .e-edit-form {
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
    padding: 7px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: inherit;
    outline: none;

    &:focus { border-color: #1976d2; }

    &.e-input--scenario {
      font-size: 0.85em;
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

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:not(:disabled):hover { background: #1565c0; }
  }

  .e-btn-cancel {
    padding: 5px 12px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    color: #555;

    &:hover { background: #f5f5f5; }
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

  .e-plan-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;

    &.is-active {
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15);
    }

    .e-edit-form {
      border-bottom: none;
      border-radius: 8px;
    }
  }

  .e-plan-main {
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &:hover .e-plan-name { color: #1976d2; }
  }

  .e-plan-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .e-active-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #1976d2;
    flex-shrink: 0;
  }

  .e-plan-name {
    font-weight: 600;
    font-size: 0.95em;
    color: #222;
    transition: color 0.1s;
  }

  .e-scenario-badge {
    align-self: flex-start;
    background: #e8eaf6;
    color: #3949ab;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.76em;
    font-weight: 500;
  }

  .e-plan-meta {
    font-size: 0.78em;
    color: #aaa;
  }

  .e-plan-actions {
    display: flex;
    gap: 4px;
    padding: 6px 10px;
    border-top: 1px solid #f5f5f5;
    background: #fafafa;
  }

  .e-action-btn {
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.78em;
    font-weight: 500;
    transition: background 0.1s;

    &.e-action-btn--edit {
      background: #f5f5f5;
      border-color: #e0e0e0;
      color: #555;
      &:hover { background: #e3f2fd; border-color: #90caf9; color: #1976d2; }
    }

    &.e-action-btn--fork {
      background: #e8f5e9;
      border-color: #a5d6a7;
      color: #2e7d32;
      &:hover { background: #c8e6c9; }
    }

    &.e-action-btn--delete {
      margin-left: auto;
      background: none;
      border-color: transparent;
      color: #bbb;
      &:hover { background: #fce4e4; border-color: #ef9a9a; color: #c62828; }
    }
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
