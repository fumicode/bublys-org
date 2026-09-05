'use client';

/**
 * ScheduleWorldLineTreeView — 勤務表のキセキの木ビュー（読み取り専用）
 *
 * ScheduleWorldLineView（世界線ビュー・canvas版、編集中の操作向け）とは別に、
 * 「作成後の評価」として世界線グラフを木のビジュアルに変換して見せるビュー。
 * ノードクリックで詳細パネルを開閉（同じノードをもう一度クリック、または
 * 閉じるボタンで閉じる）するだけで、勤務表の状態は変更しない（restore を呼ばない）。
 */
import { FC, useState } from "react";
import styled from "styled-components";
import { WorldLineTreeView } from "@bublys-org/world-line-graph";
import { useScheduleHistory } from "./useScheduleHistory.js";

type Props = {
  scheduleId: string;
};

export const ScheduleWorldLineTreeView: FC<Props> = ({ scheduleId }) => {
  const { scope } = useScheduleHistory(scheduleId);
  const getNodeLabel = (id: string) => scope.graph.state.nodes[id]?.label ?? "";

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const apexNodeId = scope.graph.state.apexNodeId;
  const selectedNode = selectedNodeId ? scope.graph.state.nodes[selectedNodeId] : null;

  const handleSelectNode = (id: string) => {
    setSelectedNodeId((prev) => (prev === id ? null : id));
  };

  if (!scope.graph.state.rootNodeId) {
    return (
      <StyledEmpty>履歴がありません。勤務表を編集すると記録されます。</StyledEmpty>
    );
  }

  return (
    <StyledRoot>
      <div className="tree-area">
        <WorldLineTreeView
          graph={scope.graph}
          getNodeLabel={getNodeLabel}
          onSelectNode={handleSelectNode}
        />
      </div>
      {selectedNode && (
        <StyledDetailPanel>
          <button
            type="button"
            className="d-close"
            onClick={() => setSelectedNodeId(null)}
            aria-label="閉じる"
          >
            ×
          </button>
          <div className="d-row">
            <span className="d-key">状態</span>
            <span className="d-val">
              {selectedNodeId === apexNodeId ? "最終状態（現在）" : "過去の状態"}
            </span>
          </div>
          {selectedNode.label && (
            <div className="d-row">
              <span className="d-key">名前</span>
              <span className="d-val">{selectedNode.label}</span>
            </div>
          )}
          <div className="d-row">
            <span className="d-key">日時</span>
            <span className="d-val">
              {new Date(selectedNode.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="d-row">
            <span className="d-key">変更件数</span>
            <span className="d-val">{selectedNode.changedRefs.length}件</span>
          </div>
        </StyledDetailPanel>
      )}
    </StyledRoot>
  );
};

const StyledRoot = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .tree-area {
    width: 100%;
    height: 100%;
  }
`;

const StyledEmpty = styled.div`
  padding: 24px;
  color: rgba(230, 235, 255, 0.6);
  font-size: 0.85em;
  font-style: italic;
`;

const StyledDetailPanel = styled.div`
  position: absolute;
  right: 12px;
  bottom: 12px;
  min-width: 180px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(20, 22, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.78em;
  color: rgba(230, 235, 255, 0.92);

  .d-close {
    position: absolute;
    top: 4px;
    right: 6px;
    border: none;
    background: transparent;
    color: rgba(230, 235, 255, 0.6);
    font-size: 1.1em;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;

    &:hover {
      color: rgba(230, 235, 255, 0.95);
    }
  }

  .d-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 2px 0;
  }
  .d-key {
    opacity: 0.6;
  }
  .d-val {
    font-weight: 600;
  }
`;
