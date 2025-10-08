'use client';
import { FC, useState } from "react";
import { AkashicRecord } from "../domain/AkashicRecord";
import { WorldLineSelectorModal } from "./WorldLineSelectorModal";
import styled from "styled-components";

const StyledTreeView = styled.div`
  .tree-container {
    background-color: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    margin: 1rem 0;
  }

  .tree-title {
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
    margin-bottom: 1rem;
    text-align: center;
  }

  .tree-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
  }

  .world-tree {
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    line-height: 1.8;
    background-color: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border: 2px solid #e9ecef;
    overflow-x: auto;
  }
    
  .empty-state {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 2rem;
  }
`;

type WorldLineTreeViewProps = {
  akashicRecord: AkashicRecord;
  currentWorldId: string;
  onWorldSelect?: (worldId: string) => void;
};

/**
 * WorldLineTreeView
 * すべての世界のカウンター値を木構造で表示するコンポーネント
 */
export const WorldLineTreeView: FC<WorldLineTreeViewProps> = ({
  akashicRecord,
  currentWorldId,
  onWorldSelect,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 世界線の分岐構造を正しく表現する表示ロジック
  const generateTreeText = () => {
    if (akashicRecord.worldLines.length === 0) return "世界が存在しません";
    
    // ルート世界線を特定（parentWorldIdが空の世界線）
    const rootWorldLine = akashicRecord.worldLines.find(wl => wl.parentWorldId === '');
    if (!rootWorldLine) return "ルート世界線が見つかりません";
    
    const result: string[] = [];
    
    // ルート世界線を表示
    const rootCounters = rootWorldLine.worlds.map(world => {
      const isCurrent = world.worldId === currentWorldId;
      return `${world.counter.value}${isCurrent ? ' [現在]' : ''}`;
    });
    result.push(rootCounters.join('-'));
    
    // 分岐世界線を表示（分岐点の位置でソート）
    const branchWorldLines = akashicRecord.worldLines.filter(wl => wl.parentWorldId !== '');
    
    branchWorldLines.forEach(branchWorldLine => {
      // 分岐世界線のカウンター値を表示
      const branchCounters = branchWorldLine.worlds.map(world => {
        const isCurrent = world.worldId === currentWorldId;
        return `${world.counter.value}${isCurrent ? ' [現在]' : ''}`;
      });
      result.push(`${branchCounters.join('-')}`);

      // 分岐先の世界からの分岐点を表示
      const childWorldLines = akashicRecord.worldLines.filter(wl => wl.parentWorldId === branchWorldLine.worldLineId);
      childWorldLines.forEach(childWorldLine => {
        const childCounters = childWorldLine.worlds.map(world => {
          const isCurrent = world.worldId === currentWorldId;
          return `${world.counter.value}${isCurrent ? ' [現在]' : ''}`;
        });
        result.push(`${childCounters.join('-')}`);
      });
    });
    return result.join('\n');
  };

  // 世界の統計情報を計算
  const totalWorlds = akashicRecord.worldLines.reduce((sum, worldLine) => sum + worldLine.worlds.length, 0);
  const treeText = generateTreeText();

  return (
    <StyledTreeView>
      <div className="tree-container">
        <div className="tree-title">
          🌳 世界の木構造
        </div>
        
        {totalWorlds > 0 ? (
          <div className="world-tree">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {treeText}
            </pre>
          </div>
        ) : (
          <div className="empty-state">
            世界が存在しません。デモデータを初期化してください。
          </div>
        )}
        
        <WorldLineSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </StyledTreeView>
  );
};
