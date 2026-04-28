'use client';

/**
 * ShiftPlanTabs — 世界線タブストリップ + 比較コントロール
 *
 * shift-plan の WorldLineGraph 内のラベル付きノードをタブとして並べる。
 * - クリック: そのノード時点の shifts を復元（apex 移動）
 * - +ボタン: 現在 apex に名前を付けてタブ化
 *
 * 比較コントロール（controlled props）:
 * - 比較対象の選択（ラベル付きタブのみ。null = 比較オフ）
 * - 表示モード切替（normal / overlay / diff）
 *
 * 比較状態は親コンポーネントが保持する設計（タブ切替で自然にリセットしやすいため）。
 *
 * 制約:
 * - apex が存在しない（操作 0 回）状態では +ボタン は無効
 * - 比較対象に現在 apex と同じノードを選んでも実質オフ扱い（差分が無い）
 * - 同じラベルでも複製は許容（最後に付けた側がそのまま表示される）
 */
import React, { FC, useState } from 'react';
import styled from 'styled-components';
import { useAppSelector, useAppStore } from '@bublys-org/state-management';
import {
  selectShiftPlanTabs,
  selectCurrentApexNodeId,
  selectShiftPlanGraph,
  nameCurrentTab,
  switchToTab,
  switchToTabAnchor,
  removeTabLabel,
} from '../world-line/index.js';
import { ShiftPlanWorldLineGraphView } from './ShiftPlanWorldLineGraphView.js';

export type ComparisonMode = 'normal' | 'overlay' | 'diff';

type Props = {
  planId: string;
  comparisonNodeId: string | null;
  comparisonMode: ComparisonMode;
  onChangeComparison: (nodeId: string | null) => void;
  onChangeMode: (mode: ComparisonMode) => void;
};

const MODE_LABELS: Record<ComparisonMode, string> = {
  normal: '通常',
  overlay: 'オーバーレイ',
  diff: '差分',
};
const MODES: ComparisonMode[] = ['normal', 'overlay', 'diff'];

export const ShiftPlanTabs: FC<Props> = ({
  planId,
  comparisonNodeId,
  comparisonMode,
  onChangeComparison,
  onChangeMode,
}) => {
  const store = useAppStore();
  const tabs = useAppSelector((s) => selectShiftPlanTabs(s, planId));
  const apexNodeId = useAppSelector((s) => selectCurrentApexNodeId(s, planId));
  const graph = useAppSelector((s) => selectShiftPlanGraph(s, planId));
  const [historyOpen, setHistoryOpen] = useState(false);

  const comparisonDisabled = comparisonNodeId === null;

  const handleAddTab = () => {
    if (!apexNodeId) {
      window.alert('まだ操作履歴がありません。配置を1つ以上行ってからタブ化してください。');
      return;
    }
    const label = window.prompt('タブ名を入力してください', '');
    if (label === null) return;
    const trimmed = label.trim();
    if (trimmed.length === 0) return;
    nameCurrentTab(planId, trimmed)(store.dispatch, store.getState);
  };

  const handleSwitch = (anchorId: string, e: React.MouseEvent) => {
    // Shift+クリック: アンカー（命名時点のスナップショット）に移動
    // 通常クリック: アンカー系譜の最新 leaf に移動
    if (e.shiftKey) {
      if (anchorId === apexNodeId) return;
      switchToTabAnchor(planId, anchorId)(store.dispatch, store.getState);
      return;
    }
    switchToTab(planId, anchorId)(store.dispatch, store.getState);
  };

  const handleDeleteTab = (anchorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTabLabel(planId, anchorId)(store.dispatch, store.getState);
  };

  const handleSelectComparison = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    onChangeComparison(v === '' ? null : v);
    // 比較オフにする場合はモードも通常に戻す
    if (v === '' && comparisonMode !== 'normal') {
      onChangeMode('normal');
    }
  };

  return (
    <StyledTabs>
      <div className="t-row t-row-tabs">
        <div className="t-list">
          {tabs.length === 0 ? (
            <span className="t-empty">タブ未作成</span>
          ) : (
            tabs.map((node) => {
              // 「タブがアクティブ」は apex がアンカーの系譜内（== or 子孫）にあるか
              const isActive = apexNodeId !== null && graph.isInLineage(apexNodeId, node.id);
              const hasDescendants = graph.getLatestDescendantLeaf(node.id) !== node.id;
              return (
                <span key={node.id} className="t-tab-wrap">
                  <button
                    type="button"
                    className={`t-tab ${isActive ? 'is-active' : ''}`}
                    onClick={(e) => handleSwitch(node.id, e)}
                    title={`クリック: 系譜の最新作業へ／Shift+クリック: 命名時点へ\nnode: ${node.id}`}
                  >
                    {node.label}
                    {hasDescendants && <span className="t-tab-tip">›</span>}
                  </button>
                  <button
                    type="button"
                    className="t-tab-del"
                    onClick={(e) => handleDeleteTab(node.id, e)}
                    title="タブを削除（履歴は残ります）"
                    aria-label="タブを削除"
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
        </div>
        <button
          type="button"
          className="t-add"
          onClick={handleAddTab}
          disabled={!apexNodeId}
          title={apexNodeId ? '現在の状態をタブ化' : '配置してからタブ化できます'}
        >
          ＋ タブ化
        </button>
        <button
          type="button"
          className="t-history"
          onClick={() => setHistoryOpen(true)}
          title="世界線の全履歴をDAGで表示"
        >
          履歴
        </button>
      </div>

      {historyOpen && (
        <StyledModalBackdrop onClick={() => setHistoryOpen(false)}>
          <StyledModalPanel onClick={(e) => e.stopPropagation()}>
            <div className="m-header">
              <span className="m-title">世界線履歴</span>
              <span className="m-hint">Ctrl/Cmd + Z で 1 ステップ戻る／+Shift で進む</span>
              <button
                type="button"
                className="m-close"
                onClick={() => setHistoryOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="m-body">
              <ShiftPlanWorldLineGraphView planId={planId} />
            </div>
          </StyledModalPanel>
        </StyledModalBackdrop>
      )}

      <div className="t-row t-row-controls">
        <label className="t-compare">
          <span>比較:</span>
          <select
            value={comparisonNodeId ?? ''}
            onChange={handleSelectComparison}
            disabled={tabs.length === 0}
          >
            <option value="">なし</option>
            {tabs.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>

        <div className="t-mode">
          <span className="t-mode-label">表示:</span>
          <div className="t-mode-segment">
            {MODES.map((m) => {
              const disabled = comparisonDisabled && m !== 'normal';
              return (
                <button
                  key={m}
                  type="button"
                  className={`t-mode-btn ${comparisonMode === m ? 'is-active' : ''}`}
                  onClick={() => onChangeMode(m)}
                  disabled={disabled}
                  title={disabled ? '比較対象を選んでください' : MODE_LABELS[m]}
                >
                  {MODE_LABELS[m]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StyledTabs>
  );
};

const StyledTabs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 10px;
  background: #f7f9fb;
  border-bottom: 1px solid #e0e6ec;
  flex-shrink: 0;

  .t-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .t-row-tabs {
    overflow-x: auto;
  }

  .t-row-controls {
    border-top: 1px dashed #d4dbe1;
    padding-top: 4px;
  }

  .t-list {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }

  .t-empty {
    font-size: 0.78em;
    color: #999;
    font-style: italic;
  }

  .t-tab-wrap {
    display: inline-flex;
    align-items: center;
    position: relative;

    &:hover .t-tab-del {
      opacity: 1;
      pointer-events: auto;
    }
  }

  .t-tab {
    padding: 3px 12px;
    border: 1px solid #c8d3dd;
    border-radius: 14px 14px 4px 4px;
    background: #fff;
    color: #455a64;
    font-size: 0.82em;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s, border-color 0.1s;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover { background: #eef3f7; }

    &.is-active {
      background: #1976d2;
      color: #fff;
      border-color: #1976d2;
      font-weight: 600;
    }

    .t-tab-tip {
      font-size: 0.85em;
      opacity: 0.65;
    }
  }

  .t-tab-del {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    padding: 0;
    border: 1px solid #b0bec5;
    border-radius: 50%;
    background: #fff;
    color: #607d8b;
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.1s;

    &:hover {
      background: #ef5350;
      color: #fff;
      border-color: #ef5350;
    }
  }

  .t-add {
    padding: 3px 10px;
    border: 1px dashed #90a4ae;
    border-radius: 12px;
    background: transparent;
    color: #607d8b;
    font-size: 0.78em;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: #eceff1;
      border-color: #607d8b;
    }
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .t-history {
    padding: 3px 10px;
    border: 1px solid #b0bec5;
    border-radius: 12px;
    background: #fff;
    color: #455a64;
    font-size: 0.78em;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      background: #eceff1;
      border-color: #607d8b;
    }
  }

  .t-compare {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78em;
    color: #546e7a;

    select {
      padding: 2px 6px;
      border: 1px solid #c8d3dd;
      border-radius: 4px;
      background: #fff;
      font-size: 0.95em;
      color: #37474f;
      cursor: pointer;

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }
  }

  .t-mode {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78em;
    color: #546e7a;
  }

  .t-mode-segment {
    display: inline-flex;
    border: 1px solid #c8d3dd;
    border-radius: 4px;
    overflow: hidden;
  }

  .t-mode-btn {
    padding: 2px 8px;
    background: #fff;
    border: none;
    border-right: 1px solid #c8d3dd;
    color: #546e7a;
    font-size: 0.95em;
    cursor: pointer;

    &:last-child { border-right: none; }
    &:hover:not(:disabled) { background: #eef3f7; }
    &.is-active {
      background: #455a64;
      color: #fff;
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
`;

const StyledModalBackdrop = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: fixed;
  inset: 0;
  background: rgba(33, 33, 33, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const StyledModalPanel = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  width: min(720px, 92vw);
  height: min(560px, 80vh);
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .m-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid #e0e6ec;
    background: #fafbfc;
    flex-shrink: 0;
  }
  .m-title {
    font-size: 0.9em;
    font-weight: 600;
    color: #37474f;
  }
  .m-hint {
    font-size: 0.72em;
    color: #78909c;
    margin-left: auto;
    white-space: nowrap;
  }
  .m-close {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: #607d8b;
    font-size: 1.1em;
    cursor: pointer;
    border-radius: 50%;
    &:hover { background: rgba(0, 0, 0, 0.08); }
  }
  .m-body {
    flex: 1;
    overflow: hidden;
  }
`;
