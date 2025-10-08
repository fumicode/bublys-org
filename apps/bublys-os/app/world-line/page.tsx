'use client';
import styled from 'styled-components';
import { WorldLineManager } from './WorldLine/feature/WorldLineManager';
import { useContext, useState, useEffect } from 'react';
import { WorldLineContext } from './WorldLine/domain/WorldLineContext';
import { CounterView } from './WorldLine/ui/CounterView';
import { WorldLineTreeView } from './WorldLine/ui/WorldLineTreeView';
import { WorldLineSelectorModal } from './WorldLine/ui/WorldLineSelectorModal';

const StyledPage = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;

  .current-world-section {
    background-color: white;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    text-align: center;
  }

  .world-selector-btn {
    padding: 0.5rem 1rem;
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 1rem;
  }
`;

function WorldLineContent() {
  const { 
    akashicRecord, 
    currentWorld, 
    currentWorldId,
    updateCounterAndCreateWorld
  } = useContext(WorldLineContext);

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Ctrl+Zで世界選択モーダルを開く
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        setIsSelectorOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // カウンター更新時に新しい世界を作成
  const handleCounterChange = (newCounter: any) => {
    if (!currentWorld || !currentWorldId) return;
    updateCounterAndCreateWorld(currentWorldId, newCounter);
  };

  return (
    <StyledPage>
      {/* 現在の世界のカウンター */}
      {currentWorld && (
        <div className="current-world-section">
          <button 
            className="world-selector-btn"
            onClick={() => setIsSelectorOpen(true)}
          >
            🌍 世界選択 (Ctrl+Z)
          </button>
          <CounterView
            counter={currentWorld.counter}
            onCounterChange={handleCounterChange}
          />
        </div>
      )}

      {/* 世界の木構造 */}
      <WorldLineTreeView
        akashicRecord={akashicRecord}
        currentWorldId={currentWorldId}
      />

      {/* 世界選択モーダル */}
      <WorldLineSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
      />
    </StyledPage>
  );
}

export default function Index() {
  return (
    <WorldLineManager>
      <WorldLineContent />
    </WorldLineManager>
  );
}