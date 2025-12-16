'use client';

import { useEffect, useState, useCallback, CSSProperties } from 'react';
import { Counter } from '../world-line/Counter/domain/Counter';
import { wrap } from '../object-shell/domain';
import { ShellManagerProvider, useShellManager } from '../object-shell/feature/ShellManager';
import { FocusedObjectProvider } from '../world-line/WorldLine/domain/FocusedObjectContext';
import { registerShellTypes } from '../object-shell/setup/registerShellTypes';
import { BubblesUI } from '../bubble-ui/BubblesUI/feature/BubblesUI';
import { ShellListPanel } from '../object-shell/ui/ShellListPanel';
import {
  HashWorldLineProvider,
  useHashWorldLine,
  HashWorldLineShellBridgeProvider,
  useHashWorldLineShellBridge,
  loadState,
} from '../hash-world-line';

// モジュール読み込み時に型を登録（ShellManagerProvider初期化前に必要）
registerShellTypes();

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  historyPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '320px',
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderLeft: '1px solid #3b3b5c',
    padding: '16px',
    overflowY: 'auto',
    fontFamily: "'SF Mono', 'Monaco', monospace",
    color: '#e0e0e0',
    fontSize: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#8b5cf6',
    marginBottom: '12px',
  },
  infoBox: {
    padding: '8px',
    backgroundColor: '#252540',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#888',
  },
};

// 分岐の色パレット
const BRANCH_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

// ============================================================================
// ObjectShellDemoContent
// ============================================================================

function ObjectShellDemoContent() {
  const { setShellWithBubble, shells } = useShellManager();
  const [isOpen, setIsOpen] = useState(false);
  const [showShellList, setShowShellList] = useState(false);
  const {
    state: worldLineState,
    activeWorldLine,
    createWorldLine,
    setActiveWorldLine,
  } = useHashWorldLine();
  const { syncShellToWorldLine } = useHashWorldLineShellBridge();

  // 世界線が無ければ作成
  useEffect(() => {
    if (!worldLineState.isLoading && worldLineState.worldLineList.length === 0) {
      createWorldLine('shell-demo-world-line', 'Shell Demo 世界線').then((wl) => {
        setActiveWorldLine(wl.state.id);
      });
    } else if (!worldLineState.isLoading && !worldLineState.activeWorldLineId && worldLineState.worldLineList.length > 0) {
      setActiveWorldLine(worldLineState.worldLineList[0].id);
    }
  }, [worldLineState.isLoading, worldLineState.worldLineList, worldLineState.activeWorldLineId, createWorldLine, setActiveWorldLine]);

  const handleCreateShellWithBubble = useCallback(() => {
    const counterId = `shell-counter-${Date.now()}`;
    const counter = new Counter(counterId, 0);
    const shell = wrap(counter, 'demo-user');

    setShellWithBubble(shell.id, shell, {
      shellType: 'counter',
      createBubble: true,
      openerBubbleId: 'root',
    });

    // 世界線に同期
    if (activeWorldLine) {
      syncShellToWorldLine(shell, 'counter', 'Counter created');
    }
  }, [setShellWithBubble, activeWorldLine, syncShellToWorldLine]);

  const handleToggleShellList = useCallback(() => {
    setShowShellList((prev) => !prev);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 16px',
          fontSize: '14px',
          cursor: 'pointer',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
        }}
      >
        Shell Demo ({shells.size})
      </button>
    );
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong>Shell Demo</strong>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            backgroundColor: '#ccc',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={handleCreateShellWithBubble}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Bubble
        </button>
        <button
          onClick={handleToggleShellList}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: showShellList ? '#1565c0' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Shell一覧 {showShellList ? '▼' : '▶'}
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666', marginBottom: showShellList ? '12px' : 0 }}>
        Shells: {shells.size}個 | 履歴: {activeWorldLine?.getHistory().length ?? 0}件
      </div>

      {/* Shell一覧パネル */}
      {showShellList && (
        <div style={{
          borderTop: '1px solid #eee',
          marginTop: '8px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}>
          <ShellListPanel />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 履歴パネル
// ============================================================================

function HistoryPanel() {
  const { activeWorldLine, rewindWorldLine } = useHashWorldLine();
  const { shells, setShell, setShellWithBubble, removeShell } = useShellManager();
  const [, forceUpdate] = useState(0);

  const handleMoveTo = useCallback(async (targetNodeId: string) => {
    if (!activeWorldLine) return;

    const snapshots = activeWorldLine.getSnapshotsAt(targetNodeId);
    await rewindWorldLine(targetNodeId);

    // 移動先の状態に存在するShell IDのセット
    const targetShellIds = new Set<string>();
    for (const snapshot of snapshots.values()) {
      if (snapshot.type === 'counter') {
        targetShellIds.add(snapshot.id);
      }
    }

    // 移動先に存在しないShellを削除（現在あるが過去にはなかったもの）
    for (const [shellId] of shells) {
      if (shellId.startsWith('shell-counter-') && !targetShellIds.has(shellId)) {
        removeShell(shellId);
      }
    }

    // 移動先の状態のShellを復元/作成
    for (const snapshot of snapshots.values()) {
      if (snapshot.type === 'counter') {
        const stateData = await loadState<{ id: string; value: number }>(snapshot);
        if (stateData) {
          const counter = Counter.fromJSON(stateData);
          const existingShell = shells.get(snapshot.id);
          if (existingShell) {
            // 既存のShellを更新
            const newShell = wrap(counter, 'demo-user');
            setShell(snapshot.id, newShell);
          } else {
            // 新しいShellを作成（Bubbleも作成）
            const newShell = wrap(counter, 'demo-user');
            setShellWithBubble(snapshot.id, newShell, {
              shellType: 'counter',
              createBubble: true,
              openerBubbleId: 'root',
            });
          }
        }
      }
    }

    forceUpdate((n) => n + 1);
  }, [activeWorldLine, rewindWorldLine, shells, setShell, setShellWithBubble, removeShell]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimestampShort = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!activeWorldLine) {
    return (
      <div style={styles.historyPanel}>
        <div style={styles.sectionTitle}>履歴</div>
        <div style={styles.infoBox}>世界線を読み込み中...</div>
      </div>
    );
  }

  const dagNodes = activeWorldLine.getHistoryDAG();
  const history = activeWorldLine.getHistory();
  const sortedDagNodes = [...dagNodes].sort((a, b) => b.node.timestamp - a.node.timestamp);
  const branchCount = dagNodes.length > 0 ? Math.max(...dagNodes.map((n) => n.branch)) + 1 : 1;

  return (
    <div style={styles.historyPanel}>
      <div style={styles.sectionTitle}>
        履歴: {activeWorldLine.state.name}
        <span style={{ fontSize: '10px', color: '#888', marginLeft: '8px' }}>
          ({history.length} commits{branchCount > 1 ? `, ${branchCount} branches` : ''})
        </span>
      </div>

      {history.length === 0 ? (
        <div style={styles.infoBox}>履歴がありません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {sortedDagNodes.map((dagNode) => {
            const { node, branch, isOnCurrentPath, isCurrent } = dagNode;
            const branchColor = BRANCH_COLORS[branch % BRANCH_COLORS.length];
            const parentNode = dagNodes.find(d => d.node.id === node.parentId);
            const parentBranch = parentNode?.branch ?? branch;
            const isBranchPoint = parentNode && parentBranch !== branch;

            return (
              <div
                key={node.id}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  minHeight: '40px',
                }}
              >
                {/* ブランチライン */}
                <div
                  style={{
                    width: `${branchCount * 14 + 12}px`,
                    minWidth: '26px',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  {Array.from({ length: branchCount }).map((_, b) => {
                    const shouldDrawLine = sortedDagNodes.some((d, di) => {
                      const currentIndex = sortedDagNodes.findIndex(n => n.node.timestamp === node.timestamp);
                      return di > currentIndex && d.branch === b;
                    });
                    if (!shouldDrawLine && b !== branch) return null;
                    const lineColor = BRANCH_COLORS[b % BRANCH_COLORS.length];
                    const isCurrentBranchLine = b === branch;
                    return (
                      <div
                        key={b}
                        style={{
                          position: 'absolute',
                          left: `${b * 14 + 6}px`,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          backgroundColor: lineColor,
                          opacity: isCurrentBranchLine && isOnCurrentPath ? 0.8 : 0.25,
                        }}
                      />
                    );
                  })}
                  {isBranchPoint && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${Math.min(parentBranch, branch) * 14 + 7}px`,
                        bottom: '50%',
                        width: `${Math.abs(parentBranch - branch) * 14}px`,
                        height: '2px',
                        backgroundColor: branchColor,
                        opacity: 0.6,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${branch * 14 + 3}px`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: isCurrent ? '10px' : '6px',
                      height: isCurrent ? '10px' : '6px',
                      borderRadius: '50%',
                      backgroundColor: branchColor,
                      border: isCurrent ? '2px solid white' : 'none',
                      opacity: isOnCurrentPath ? 1 : 0.5,
                      zIndex: 2,
                    }}
                  />
                </div>

                {/* コミット情報 */}
                <div
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    backgroundColor: isCurrent ? '#3b3b5c' : isOnCurrentPath ? '#252540' : '#1a1a2e',
                    borderRadius: '4px',
                    opacity: isOnCurrentPath ? 1 : 0.6,
                    cursor: isCurrent ? 'default' : 'pointer',
                    marginBottom: '2px',
                  }}
                  onClick={() => !isCurrent && handleMoveTo(node.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        color: branchColor,
                        backgroundColor: `${branchColor}20`,
                        padding: '1px 3px',
                        borderRadius: '2px',
                      }}
                    >
                      {formatTimestampShort(node.timestamp)}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: '8px',
                          color: '#fff',
                          backgroundColor: '#8b5cf6',
                          padding: '1px 4px',
                          borderRadius: '2px',
                          fontWeight: 'bold',
                        }}
                      >
                        HEAD
                      </span>
                    )}
                    <span style={{ fontSize: '9px', color: '#666' }}>
                      {formatTimestamp(node.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                    {node.description || node.changedObjects.map((o) => `${o.type}:${o.id}`).join(', ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ObjectShellDemo() {
  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
        <HashWorldLineProvider>
          <HashWorldLineShellBridgeProvider>
            <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
              {/* デモコントロールパネル */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                zIndex: 1000,
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}>
                <ObjectShellDemoContent />
              </div>

              {/* Bubble UI - Shellが作成されたBubbleを表示 */}
              <BubblesUI />

              {/* 履歴パネル */}
              <HistoryPanel />
            </div>
          </HashWorldLineShellBridgeProvider>
        </HashWorldLineProvider>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
