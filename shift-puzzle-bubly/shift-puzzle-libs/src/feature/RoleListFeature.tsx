'use client';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { Role } from '@bublys-org/shift-puzzle-model';
import {
  selectRolesForEvent,
  addRole,
  deleteRole,
} from '../slice/index.js';

interface RoleListFeatureProps {
  eventId: string;
  onRoleSelect?: (roleId: string) => void;
}

const ROLE_COLORS = [
  '#4caf50', '#2196f3', '#ff9800', '#e91e63',
  '#9c27b0', '#00bcd4', '#ff5722', '#607d8b',
];

/** 役割一覧・作成（Phase 1 / Issue #39） */
export const RoleListFeature: React.FC<RoleListFeatureProps> = ({
  eventId,
  onRoleSelect,
}) => {
  const dispatch = useAppDispatch();
  const roles = useAppSelector(selectRolesForEvent(eventId));

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState(1);
  const [newColor, setNewColor] = useState(ROLE_COLORS[0]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const role = Role.create({
      name: newName.trim(),
      eventId,
      minRequired: newMin,
      color: newColor,
    });
    dispatch(addRole(role.toJSON()));
    setCreating(false);
    setNewName('');
    setNewMin(1);
  };

  return (
    <StyledWrapper>
      <div className="e-header">
        <span className="e-title">役割一覧</span>
        <button className="e-create-btn" onClick={() => setCreating(true)}>
          ＋ 追加
        </button>
      </div>

      {creating && (
        <div className="e-create-form">
          <div className="e-form-row">
            <input
              className="e-input e-input--grow"
              placeholder="役割名（例: 受付係）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <input
              className="e-input e-input--narrow"
              type="number"
              min={1}
              max={99}
              value={newMin}
              onChange={(e) => setNewMin(Number(e.target.value))}
              title="最小必要人数"
            />
            <span className="e-form-label">人以上</span>
          </div>
          <div className="e-color-picker">
            {ROLE_COLORS.map((c) => (
              <button
                key={c}
                className={`e-color-dot ${newColor === c ? 'is-selected' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <div className="e-form-actions">
            <button className="e-btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
              追加
            </button>
            <button className="e-btn-cancel" onClick={() => { setCreating(false); setNewName(''); }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="e-list">
        {roles.length === 0 && !creating && (
          <div className="e-empty">役割が登録されていません。</div>
        )}
        {roles.map((role) => (
          <div key={role.id} className="e-role-card">
            <div className="e-role-dot" style={{ background: role.color }} />
            <div className="e-role-info" onClick={() => onRoleSelect?.(role.id)}>
              <div className="e-role-name">{role.name}</div>
              <div className="e-role-req">
                {role.minRequired}人以上
                {role.maxRequired !== null && `・${role.maxRequired}人以下`}
              </div>
            </div>
            <button
              className="e-delete-btn"
              onClick={() => dispatch(deleteRole(role.id))}
              title="削除"
            >
              ×
            </button>
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

  .e-form-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .e-input {
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
    outline: none;

    &:focus { border-color: #1976d2; }
    &.e-input--grow { flex: 1; }
    &.e-input--narrow { width: 56px; text-align: center; }
  }

  .e-form-label {
    font-size: 0.82em;
    color: #666;
    white-space: nowrap;
  }

  .e-color-picker {
    display: flex;
    gap: 6px;
  }

  .e-color-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;

    &.is-selected {
      border-color: #333;
      box-shadow: 0 0 0 2px white inset;
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

  .e-role-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
  }

  .e-role-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .e-role-info {
    flex: 1;
    cursor: pointer;

    &:hover .e-role-name { color: #1976d2; }
  }

  .e-role-name {
    font-weight: 600;
    font-size: 0.92em;
    color: #222;
  }

  .e-role-req {
    font-size: 0.78em;
    color: #888;
    margin-top: 1px;
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
