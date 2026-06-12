'use client';

/**
 * ShiftPlanWorldLineGraphView — 世界線 DAG ツリービュー
 *
 * 1 plan の WorldLineGraph をインデント式 DAG として表示し、ノードクリックで
 * apex 移動 + shifts 復元。タブストリップだけでは見えない無名ノードも俯瞰できる。
 *
 * - apex ノードはハイライト
 * - ラベル付きノード（タブ）は label を表示、無名ノードは id 末尾を表示
 * - worldLineId ごとに色分け（分岐が直感的にわかる）
 * - ノードに含まれる「変更された shift」数を表示（CAS が効いている直感）
 * - 「この状態から新しいシフト表を作成」: 現在のapex状態を引き継いで新プランを作成
 */
import React, { FC, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppSelector, useAppStore } from '@bublys-org/state-management';
import {
  selectShiftPlanGraph,
  selectCurrentApexNodeId,
  selectShiftsAtNode,
  switchToTabAnchor,
} from '../world-line/index.js';
import { selectShiftPlanById, addShiftPlan, ShiftPlan } from '../slice/index.js';
import type { WeatherCondition } from '@bublys-org/hotel-shift-puzzle-model';

type Props = {
  planId: string;
};

const COLOR_PALETTE = [
  '#1976d2', '#388e3c', '#f57f17', '#c62828',
  '#7b1fa2', '#00838f', '#5d4037', '#ad1457',
];

export const ShiftPlanWorldLineGraphView: FC<Props> = ({ planId }) => {
  const store = useAppStore();
  const graph = useAppSelector((s) => selectShiftPlanGraph(s, planId));
  const apexNodeId = useAppSelector((s) => selectCurrentApexNodeId(s, planId));
  const currentPlan = useAppSelector((s) => selectShiftPlanById(planId)(s));
  const apexShifts = useAppSelector((s) =>
    apexNodeId ? selectShiftsAtNode(s, planId, apexNodeId) : []
  );

  const { nodes, rootNodeId } = graph.state;
  const childrenMap = useMemo(() => graph.getChildrenMap(), [graph]);

  // 世界線断ち切りフォーム
  const [formOpen, setFormOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newName, setNewName] = useState('');
  const [newWeather, setNewWeather] = useState<WeatherCondition | ''>('');

  const handleCreateFromWorldLine = () => {
    if (!newDate) return;
    const effectiveName = newName.trim() || newDate;
    const timeSchedules = currentPlan?.state.timeSchedules ?? [];
    const plan = ShiftPlan.createFromWorldLine(
      effectiveName,
      newDate,
      apexShifts,
      timeSchedules,
      newWeather || undefined,
    );
    store.dispatch(addShiftPlan(plan.state));
    setFormOpen(false);
    setNewName('');
    setNewWeather('');
  };

  // worldLineId → 色を割当
  const worldLineColors = useMemo(() => {
    const ids: string[] = [];
    for (const node of Object.values(nodes)) {
      if (!ids.includes(node.worldLineId)) ids.push(node.worldLineId);
    }
    const colors: Record<string, string> = {};
    ids.forEach((wlId, idx) => {
      colors[wlId] = COLOR_PALETTE[idx % COLOR_PALETTE.length];
    });
    return colors;
  }, [nodes]);

  const handleSelect = (nodeId: string) => {
    if (nodeId === apexNodeId) return;
    switchToTabAnchor(planId, nodeId)(store.dispatch, store.getState);
  };

  if (!rootNodeId) {
    return <StyledEmpty>履歴がありません。配置を1つ以上行うと記録されます。</StyledEmpty>;
  }

  const renderNode = (nodeId: string, depth: number): React.ReactNode => {
    const node = nodes[nodeId];
    if (!node) return null;
    const isApex = nodeId === apexNodeId;
    const color = worldLineColors[node.worldLineId] ?? '#666';
    const children = childrenMap[nodeId] ?? [];
    const changedCount = node.changedRefs.length;
    const ts = new Date(node.timestamp);
    const tsLabel = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;

    return (
      <div key={nodeId}>
        <StyledNodeRow style={{ paddingLeft: 8 + depth * 16 }}>
          <StyledNodeBtn
            type="button"
            $color={color}
            $isApex={isApex}
            onClick={() => handleSelect(nodeId)}
            title={`node: ${nodeId}\nworldLine: ${node.worldLineId}\nchanged: ${changedCount}`}
          >
            <span className="g-dot" />
            <span className="g-label">
              {node.label ? node.label : `#${nodeId.slice(-6)}`}
            </span>
            <span className="g-meta">{changedCount}変更</span>
            <span className="g-time">{tsLabel}</span>
            {isApex && <span className="g-apex">現在</span>}
          </StyledNodeBtn>
        </StyledNodeRow>
        {children.map((cid) => renderNode(cid, depth + 1))}
      </div>
    );
  };

  return (
    <StyledRoot>
      <StyledLegend>
        {Object.entries(worldLineColors).map(([wlId, color]) => (
          <span key={wlId} className="lg-item">
            <span className="lg-dot" style={{ background: color }} />
            <span className="lg-id">{wlId.slice(-8)}</span>
          </span>
        ))}
      </StyledLegend>
      <StyledTree>{renderNode(rootNodeId, 0)}</StyledTree>

      {/* 世界線断ち切りパネル */}
      <StyledCutPanel>
        {!formOpen ? (
          <button
            type="button"
            className="cut-toggle-btn"
            onClick={() => setFormOpen(true)}
          >
            ✂ この状態から新しいシフト表を作成
          </button>
        ) : (
          <div className="cut-form">
            <div className="cut-form-row">
              <label className="cut-label">日付<span className="cut-required">*</span></label>
              <input
                type="date"
                className="cut-date-input"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </div>
            <div className="cut-form-row">
              <label className="cut-label">シフト名</label>
              <input
                type="text"
                className="cut-name-input"
                placeholder={newDate || '日付を入力'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="cut-form-row">
              <label className="cut-label">天候</label>
              <select
                className="cut-weather-select"
                value={newWeather}
                onChange={(e) => setNewWeather(e.target.value as WeatherCondition | '')}
              >
                <option value="">指定なし</option>
                <option value="晴れ">晴れ</option>
                <option value="雨">雨</option>
              </select>
            </div>
            <div className="cut-form-actions">
              <button
                type="button"
                className="cut-cancel-btn"
                onClick={() => { setFormOpen(false); setNewName(''); setNewWeather(''); }}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="cut-create-btn"
                onClick={handleCreateFromWorldLine}
                disabled={!newDate}
              >
                作成
              </button>
            </div>
          </div>
        )}
      </StyledCutPanel>
    </StyledRoot>
  );
};

const StyledRoot = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
`;

const StyledLegend = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 6px 10px;
  border-bottom: 1px solid #e0e6ec;
  background: #fafbfc;
  font-size: 0.72em;
  color: #607d8b;

  .lg-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .lg-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .lg-id {
    font-family: ui-monospace, Menlo, monospace;
  }
`;

const StyledTree = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  flex: 1;
  overflow: auto;
  padding: 8px 4px;
`;

const StyledEmpty = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  padding: 24px;
  color: #888;
  font-size: 0.85em;
  font-style: italic;
  text-align: center;
`;

const StyledNodeRow = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  align-items: center;
  margin: 2px 0;
`;

type NodeBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  $color: string;
  $isApex: boolean;
};
const StyledNodeBtn = styled.button<NodeBtnProps>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid ${(p) => p.$color};
  background: ${(p) => (p.$isApex ? p.$color : '#fff')};
  color: ${(p) => (p.$isApex ? '#fff' : p.$color)};
  border-radius: 4px;
  cursor: ${(p) => (p.$isApex ? 'default' : 'pointer')};
  font-size: 0.78em;
  font-weight: ${(p) => (p.$isApex ? 700 : 500)};
  transition: background 0.1s;
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$isApex ? p.$color : '#f5f7fa')};
  }

  .g-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(p) => p.$color};
    border: 1px solid ${(p) => (p.$isApex ? '#fff' : p.$color)};
  }
  .g-label {
    font-family: ui-monospace, Menlo, monospace;
  }
  .g-meta {
    font-size: 0.85em;
    opacity: 0.7;
  }
  .g-time {
    font-size: 0.8em;
    opacity: 0.55;
    font-family: ui-monospace, Menlo, monospace;
  }
  .g-apex {
    font-size: 0.75em;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.25);
  }
`;

const StyledCutPanel = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  flex-shrink: 0;
  border-top: 1px solid #e0e6ec;
  background: #fafbfc;
  padding: 8px 10px;

  .cut-toggle-btn {
    width: 100%;
    padding: 6px 12px;
    border: 1px dashed #90a4ae;
    border-radius: 6px;
    background: transparent;
    color: #546e7a;
    font-size: 0.8em;
    cursor: pointer;
    text-align: center;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: #ecf0f1;
      border-color: #607d8b;
      color: #37474f;
    }
  }

  .cut-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cut-form-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cut-label {
    font-size: 0.78em;
    color: #607d8b;
    flex-shrink: 0;
    width: 4em;
    text-align: right;
  }

  .cut-required {
    color: #e53935;
    margin-left: 2px;
  }

  .cut-date-input,
  .cut-name-input,
  .cut-weather-select {
    flex: 1;
    padding: 4px 7px;
    border: 1px solid #cfd8dc;
    border-radius: 5px;
    font-size: 0.82em;
    outline: none;
    background: #fff;

    &:focus {
      border-color: #1976d2;
    }
  }

  .cut-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 2px;
  }

  .cut-cancel-btn {
    padding: 4px 12px;
    border: 1px solid #cfd8dc;
    border-radius: 5px;
    background: #fff;
    color: #607d8b;
    font-size: 0.8em;
    cursor: pointer;

    &:hover {
      background: #eceff1;
    }
  }

  .cut-create-btn {
    padding: 4px 14px;
    border: none;
    border-radius: 5px;
    background: #1976d2;
    color: #fff;
    font-size: 0.8em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.1s;

    &:hover:not(:disabled) {
      background: #1565c0;
    }

    &:disabled {
      background: #b0bec5;
      cursor: default;
    }
  }
`;
