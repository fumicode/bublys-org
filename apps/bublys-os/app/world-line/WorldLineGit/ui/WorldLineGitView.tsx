import React from 'react';
import { useContext } from 'react';
import { WorldLineGitContext } from '../domain/WorldLineGitContext';
import { CounterView } from './CounterView';
import { CreateTreeView } from './CreateTreeView';

// InitializeButtonコンポーネントを直接定義
function InitializeButton({ onInitialize, disabled = false }: { onInitialize: () => void; disabled?: boolean }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '2rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      marginBottom: '2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ 
          margin: '0 0 1rem 0', 
          color: '#333',
          fontSize: '1.2rem'
        }}>
          🌍 WorldLineGit を初期化
        </h3>
        <p style={{ 
          margin: '0 0 1.5rem 0', 
          color: '#666',
          fontSize: '0.9rem'
        }}>
          新しい世界線を開始するには、初期化ボタンをクリックしてください
        </p>
        <button
          onClick={onInitialize}
          disabled={disabled}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: disabled ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,123,255,0.3)',
            transition: 'all 0.2s ease',
            minWidth: '120px'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = '#0056b3';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = '#007bff';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {disabled ? '初期化中...' : '🚀 初期化'}
        </button>
      </div>
    </div>
  );
}

export function WorldLineGitView() {
  const {
    apexWorld,
    apexWorldId,
    grow,
    setApex,
    getAllWorlds,
    getWorldTree,
    isModalOpen,
    closeModal,
    initialize,
    isInitializing,
    isInitialized,
  } = useContext(WorldLineGitContext);

  const handleWorldSelect = (worldId: string) => {
    setApex(worldId);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* 初期化ボタン（未初期化時のみ表示） */}
      {!isInitialized && (
        <InitializeButton 
          onInitialize={initialize}
          disabled={isInitializing}
        />
      )}

      {/* 現在の世界のカウンター（初期化済み時のみ表示） */}
      {isInitialized && apexWorld && (
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
              ID: {apexWorldId?.substring(0, 12)}...
            </div>
            <div style={{ color: '#666', fontSize: '0.8rem' }}>
              世界線ID: {apexWorld.apexWorldLineId.substring(0, 12)}...
            </div>
          </div>
          
          <CounterView
            counter={apexWorld.counter}
            onCounterChange={grow}
          />
        </div>
      )}

      {/* 世界ツリー（Ctrl+Zで表示） */}
      {isInitialized && isModalOpen && (
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
            currentCreateId={apexWorldId}
            onCreateSelect={handleWorldSelect}
            createTree={getWorldTree()}
          />
        </div>
      )}

      {/* /* 世界ツリー（デバッグ用）
      <CreateTreeView
        creates={getAllWorlds()}
        currentCreateId={apexWorldId}
        onCreateSelect={handleWorldSelect}
        createTree={getWorldTree()}
      /> */}
    </div>
  );
}