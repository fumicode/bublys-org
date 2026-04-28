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
 */
import React, { FC, useMemo } from 'react';
import styled from 'styled-components';
import { useAppSelector, useAppStore } from '@bublys-org/state-management';
import {
  selectShiftPlanGraph,
  selectCurrentApexNodeId,
  switchToTab,
} from '../world-line/index.js';

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

  const { nodes, rootNodeId } = graph.state;
  const childrenMap = useMemo(() => graph.getChildrenMap(), [graph]);

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
    switchToTab(planId, nodeId)(store.dispatch, store.getState);
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
  cursor: pointer;
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
