import React from 'react';
import { useContext } from 'react';
import { WorldLineGitContext } from '../domain/WorldLineGitContext';
import { CounterView } from './CounterView';
import { CreateTreeView } from './CreateTreeView';

export function WorldLineGitView() {
  const {
    currentWorld,
    currentWorldId,
    updateCounter,
    checkout,
    getAllWorlds,
    getWorldTree,
    isModalOpen,
    closeModal
  } = useContext(WorldLineGitContext);

  const handleWorldSelect = (worldId: string) => {
    checkout(worldId);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* 現在の世界のカウンター */}
      {currentWorld && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
              現在の世界
            </h3>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              ID: {currentWorldId?.substring(0, 12)}...
            </div>
            <div style={{ color: '#666', fontSize: '0.8rem' }}>
              世界線ID: {currentWorld.currentWorldLineId.substring(0, 12)}...
            </div>
          </div>
          
          <CounterView
            counter={currentWorld.counter}
            onCounterChange={updateCounter}
          />
        </div>
      )}

      {/* 世界ツリー（Ctrl+Zで表示） */}
      {isModalOpen && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          border: '2px solid #007bff'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: '0', color: '#333' }}>
              🌍 世界線選択 (Ctrl+Z)
            </h3>
            <button
              onClick={closeModal}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ 閉じる
            </button>
          </div>
          
          <CreateTreeView
            creates={getAllWorlds()}
            currentCreateId={currentWorldId}
            onCreateSelect={handleWorldSelect}
            createTree={getWorldTree()}
          />
        </div>
      )}

      {/* 世界ツリー（デバッグ用）
      <CreateTreeView
        creates={getAllWorlds()}
        currentCreateId={currentWorldId}
        onCreateSelect={handleWorldSelect}
        createTree={getWorldTree()}
      /> */}
    </div>
  );
}