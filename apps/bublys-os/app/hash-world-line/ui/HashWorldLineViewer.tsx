'use client';

/**
 * HashWorldLineViewer
 * 世界線の状態を表示・操作するUIコンポーネント
 *
 * 機能:
 * - 世界線一覧の表示
 * - 新規世界線の作成
 * - アクティブ世界線の切り替え
 * - 世界線の履歴（DAG）表示
 * - 状態の復元（巻き戻し）
 */
import React, { useState, useCallback, CSSProperties } from 'react';
import { useHashWorldLine } from '../feature/HashWorldLineManager';
import type { WorldHistoryNode } from '../domain/HashWorldLine';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '16px',
    background: '#1a1a2e',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontFamily: "'SF Mono', 'Monaco', monospace",
    fontSize: '13px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#8b5cf6',
  },
  worldLineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  worldLineItem: {
    padding: '8px 12px',
    background: '#252540',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid transparent',
  },
  worldLineItemActive: {
    background: '#3b3b5c',
    border: '1px solid #8b5cf6',
  },
  worldLineName: {
    fontWeight: 500,
  },
  worldLineId: {
    fontSize: '11px',
    color: '#888',
  },
  button: {
    padding: '6px 12px',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  buttonDisabled: {
    background: '#555',
    cursor: 'not-allowed',
  },
  smallButton: {
    padding: '4px 8px',
    fontSize: '11px',
    background: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '4px 8px',
    fontSize: '11px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  input: {
    padding: '6px 12px',
    background: '#252540',
    border: '1px solid #3b3b5c',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    width: '200px',
  },
  createForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  historyContainer: {
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  historyNode: {
    padding: '8px',
    background: '#252540',
    borderRadius: '4px',
    marginBottom: '4px',
    borderLeft: '3px solid #555',
  },
  historyNodeCurrent: {
    background: '#3b3b5c',
    borderLeft: '3px solid #8b5cf6',
  },
  historyTimestamp: {
    fontSize: '11px',
    color: '#888',
  },
  historyHash: {
    fontSize: '10px',
    color: '#666',
    fontFamily: 'monospace',
  },
  historyChanges: {
    fontSize: '12px',
    marginTop: '4px',
  },
  historyDescription: {
    fontSize: '11px',
    color: '#aaa',
    marginTop: '2px',
  },
  historyActions: {
    marginTop: '4px',
  },
  emptyState: {
    color: '#666',
    fontStyle: 'italic',
    padding: '8px',
  },
  objectCount: {
    fontSize: '11px',
    color: '#10b981',
    marginLeft: '8px',
  },
  error: {
    color: '#ef4444',
  },
};

// ============================================================================
// Component
// ============================================================================

export function HashWorldLineViewer() {
  const {
    state,
    activeWorldLine,
    createWorldLine,
    setActiveWorldLine,
    deleteWorldLine,
    rewindWorldLine,
  } = useHashWorldLine();

  const [newWorldLineName, setNewWorldLineName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateWorldLine = useCallback(async () => {
    if (!newWorldLineName.trim()) return;

    setIsCreating(true);
    try {
      const id = `world-line-${Date.now()}`;
      const worldLine = await createWorldLine(id, newWorldLineName.trim());
      await setActiveWorldLine(worldLine.state.id);
      setNewWorldLineName('');
    } catch (error) {
      console.error('Failed to create world line:', error);
    } finally {
      setIsCreating(false);
    }
  }, [newWorldLineName, createWorldLine, setActiveWorldLine]);

  const handleSelectWorldLine = useCallback(
    async (id: string) => {
      await setActiveWorldLine(id);
    },
    [setActiveWorldLine]
  );

  const handleDeleteWorldLine = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('この世界線を削除しますか？')) {
        await deleteWorldLine(id);
      }
    },
    [deleteWorldLine]
  );

  const handleRewind = useCallback(
    async (worldStateHash: string) => {
      if (confirm('この状態に巻き戻しますか？')) {
        await rewindWorldLine(worldStateHash);
      }
    },
    [rewindWorldLine]
  );

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatHash = (hash: string) => {
    return hash.substring(0, 8) + '...';
  };

  if (state.isLoading) {
    return <div style={styles.container}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      {/* 世界線作成フォーム */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>新規世界線を作成</h3>
        <div style={styles.createForm}>
          <input
            type="text"
            placeholder="世界線の名前"
            value={newWorldLineName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewWorldLineName(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === 'Enter' && handleCreateWorldLine()
            }
            style={styles.input}
          />
          <button
            onClick={handleCreateWorldLine}
            disabled={isCreating || !newWorldLineName.trim()}
            style={{
              ...styles.button,
              ...(isCreating || !newWorldLineName.trim()
                ? styles.buttonDisabled
                : {}),
            }}
          >
            {isCreating ? '作成中...' : '作成'}
          </button>
        </div>
      </div>

      {/* 世界線一覧 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>世界線一覧</h3>
        <div style={styles.worldLineList}>
          {state.worldLineList.length === 0 ? (
            <div style={styles.emptyState}>世界線がありません</div>
          ) : (
            state.worldLineList.map((wl) => {
              const isActive = state.activeWorldLineId === wl.id;
              const worldLine = state.worldLines.get(wl.id);
              const objectCount = worldLine?.getCurrentState().size() || 0;

              return (
                <div
                  key={wl.id}
                  style={{
                    ...styles.worldLineItem,
                    ...(isActive ? styles.worldLineItemActive : {}),
                  }}
                  onClick={() => handleSelectWorldLine(wl.id)}
                >
                  <div>
                    <span style={styles.worldLineName}>{wl.name}</span>
                    {objectCount > 0 && (
                      <span style={styles.objectCount}>
                        ({objectCount} objects)
                      </span>
                    )}
                    <br />
                    <span style={styles.worldLineId}>{wl.id}</span>
                  </div>
                  <button
                    style={styles.dangerButton}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                      handleDeleteWorldLine(wl.id, e)
                    }
                  >
                    削除
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* アクティブ世界線の履歴 */}
      {activeWorldLine && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            履歴: {activeWorldLine.state.name}
          </h3>
          <div style={styles.historyContainer}>
            {activeWorldLine.getHistory().length === 0 ? (
              <div style={styles.emptyState}>履歴がありません</div>
            ) : (
              [...activeWorldLine.getHistory()].reverse().map((node, index) => {
                const isLatest = index === 0;
                return (
                  <HistoryNodeView
                    key={node.worldStateHash}
                    node={node}
                    isCurrent={isLatest}
                    onRewind={handleRewind}
                    formatTimestamp={formatTimestamp}
                    formatHash={formatHash}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {state.error && (
        <div style={styles.section}>
          <div style={styles.error}>Error: {state.error}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface HistoryNodeViewProps {
  node: WorldHistoryNode;
  isCurrent: boolean;
  onRewind: (hash: string) => void;
  formatTimestamp: (ts: number) => string;
  formatHash: (hash: string) => string;
}

function HistoryNodeView({
  node,
  isCurrent,
  onRewind,
  formatTimestamp,
  formatHash,
}: HistoryNodeViewProps) {
  return (
    <div
      style={{
        ...styles.historyNode,
        ...(isCurrent ? styles.historyNodeCurrent : {}),
      }}
    >
      <div style={styles.historyTimestamp}>
        {formatTimestamp(node.timestamp)}
        {isCurrent && ' (現在)'}
      </div>
      <div style={styles.historyHash}>
        hash: {formatHash(node.worldStateHash)}
      </div>
      <div style={styles.historyChanges}>
        変更: {node.changedObjects.map((o) => `${o.type}:${o.id}`).join(', ')}
      </div>
      {node.description && (
        <div style={styles.historyDescription}>{node.description}</div>
      )}
      {!isCurrent && (
        <div style={styles.historyActions}>
          <button
            style={styles.smallButton}
            onClick={() => onRewind(node.worldStateHash)}
          >
            この状態に戻す
          </button>
        </div>
      )}
    </div>
  );
}
