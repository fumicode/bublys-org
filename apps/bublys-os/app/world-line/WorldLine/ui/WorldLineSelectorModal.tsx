'use client';
import { FC, useState } from "react";
import { useWorldLineContext } from "./useWorldLineContext";
import styled from "styled-components";

const ModalOverlay = styled.div<{ onClick: () => void; children: React.ReactNode }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div<{ onClick: (e: React.MouseEvent) => void; children: React.ReactNode }>`
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #333;
`;

const CloseButton = styled.button<{ onClick: () => void; children: React.ReactNode }>`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const WorldList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const WorldItem = styled.button<{ onClick: () => void; className: string; style: React.CSSProperties; children: React.ReactNode }>`
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    border-color: #2196f3;
    background-color: #f8f9fa;
  }
  
  &.current {
    border-color: #ff9800;
    background-color: #fff3e0;
  }
`;

const WorldCounter = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
`;

const WorldId = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
`;

type WorldLineSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * WorldLineSelectorModal
 * 世界線切り替え用のModalコンポーネント
 */
export const WorldLineSelectorModal: FC<WorldLineSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { akashicRecord, currentWorldId, switchToWorldAndCreateBranch } = useWorldLineContext();
  const [selectedWorldId, setSelectedWorldId] = useState<string>('');

  if (!isOpen) return null;

  // 全ての世界を取得
  const getAllWorlds = () => {
    const allWorlds: any[] = [];
    akashicRecord.worldLines.forEach(worldLine => {
      worldLine.worlds.forEach(world => {
        allWorlds.push({ ...world, worldLineId: worldLine.worldLineId });
      });
    });
    return allWorlds;
  };

  const allWorlds = getAllWorlds();

  const handleWorldSelect = (worldId: string) => {
    setSelectedWorldId(worldId);
  };

  const handleSwitchWorld = () => {
    if (selectedWorldId && selectedWorldId !== currentWorldId) {
      switchToWorldAndCreateBranch(selectedWorldId);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedWorldId('');
    onClose();
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🌍 世界線切り替え</ModalTitle>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </ModalHeader>
        
        {allWorlds.length > 0 ? (
          <>
            <WorldList>
              {allWorlds.map((world) => (
                <WorldItem
                  key={world.worldId}
                  className={world.worldId === currentWorldId ? 'current' : ''}
                  onClick={() => handleWorldSelect(world.worldId)}
                  style={{
                    backgroundColor: selectedWorldId === world.worldId ? '#e3f2fd' : undefined,
                    borderColor: selectedWorldId === world.worldId ? '#2196f3' : undefined,
                  }}
                >
                  <WorldCounter>
                    {world.counter.value}
                    {world.worldId === currentWorldId ? ' [現在]' : ''}
                  </WorldCounter>
                  <WorldId>{world.worldId}</WorldId>
                </WorldItem>
              ))}
            </WorldList>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSwitchWorld}
                disabled={!selectedWorldId || selectedWorldId === currentWorldId}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: selectedWorldId && selectedWorldId !== currentWorldId ? '#2196f3' : '#ccc',
                  color: 'white',
                  cursor: selectedWorldId && selectedWorldId !== currentWorldId ? 'pointer' : 'not-allowed',
                }}
              >
                世界を切り替え
              </button>
            </div>
          </>
        ) : (
          <EmptyState>
            世界が存在しません。デモデータを初期化してください。
          </EmptyState>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};
