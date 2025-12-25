'use client';

/**
 * ハッシュ世界線デモページ
 *
 * 機能:
 * - Counter を作成して操作
 * - 世界線を作成して状態を同期
 * - 履歴の確認と巻き戻し
 */
import { useEffect, useCallback, CSSProperties, useState } from 'react';
import { Counter } from '../counter/Counter';
import {
  wrap,
  type ObjectShell,
  ShellManagerProvider,
  useShellManager,
} from '@bublys-org/object-shell';
import { registerShellTypes } from '../counter/registerShellTypes';
import {
  AkashicRecordProvider,
  useAkashicRecord,
  loadState,
} from '@bublys-org/akashic-record';
import type { HashWorldLine } from '@bublys-org/hash-world-line';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    fontFamily: "'SF Mono', 'Monaco', monospace",
  },
  leftPanel: {
    flex: 1,
    padding: '24px',
    backgroundColor: '#0f0f1a',
    color: '#e0e0e0',
    overflowY: 'auto',
  },
  rightPanel: {
    width: '400px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderLeft: '1px solid #3b3b5c',
    overflowY: 'auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#8b5cf6',
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#8b5cf6',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  counterCard: {
    padding: '16px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  counterValue: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: '12px',
  },
  counterButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  counterId: {
    fontSize: '10px',
    color: '#666',
    wordBreak: 'break-all' as const,
  },
  button: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
  },
  successButton: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#888',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px',
    color: '#666',
  },
};

// ============================================================================
// Counter カード コンポーネント
// ============================================================================

interface CounterCardProps {
  shell: ObjectShell<Counter>;
}

function CounterCard({ shell }: CounterCardProps) {
  const { setShell } = useShellManager();

  const handleIncrement = () => {
    shell.countUp();
    setShell(shell.id, shell);
  };

  const handleDecrement = () => {
    shell.countDown();
    setShell(shell.id, shell);
  };

  return (
    <div style={styles.counterCard}>
      <div style={styles.counterValue}>{shell.value}</div>
      <div style={styles.counterButtons}>
        <button
          style={{ ...styles.button, ...styles.dangerButton }}
          onClick={handleDecrement}
        >
          -1
        </button>
        <button
          style={{ ...styles.button, ...styles.successButton }}
          onClick={handleIncrement}
        >
          +1
        </button>
      </div>
      <div style={styles.counterId}>{shell.id}</div>
    </div>
  );
}

// ============================================================================
// デモコンテンツ
// ============================================================================

function DemoContent() {
  const { setShellWithBubble, shells, setShell } = useShellManager();
  const {
    activeWorldLine,
    worldLineList,
    isInitialized,
    createWorldLine,
    setActiveWorldLine,
    moveTo,
    registerShell,
    record,
  } = useAkashicRecord();

  // 強制再レンダリング用
  const [, forceUpdate] = useState(0);

  // 世界線が無ければ作成
  useEffect(() => {
    if (!isInitialized) return;

    const initWorldLine = async () => {
      if (worldLineList.length === 0) {
        const wl = await createWorldLine('main-world-line', 'メイン世界線');
        await setActiveWorldLine(wl.state.id);
      } else if (!activeWorldLine) {
        await setActiveWorldLine(worldLineList[0].id);
      }
    };

    initWorldLine();
  }, [isInitialized, worldLineList, activeWorldLine, createWorldLine, setActiveWorldLine]);

  // 世界線がアクティブになったらShellを復元
  useEffect(() => {
    if (!activeWorldLine) return;

    const restoreShells = async () => {
      const currentNode = activeWorldLine.getCurrentHistoryNode();
      if (!currentNode) return;

      const snapshots = activeWorldLine.getSnapshotsAt(currentNode.id);

      for (const snapshot of snapshots.values()) {
        if (snapshot.type === 'counter') {
          const stateData = await loadState<{ id: string; value: number }>(snapshot);
          if (stateData) {
            const counter = Counter.fromJSON(stateData);
            const existingShell = shells.get(snapshot.id);

            if (existingShell) {
              const newShell = wrap(counter, 'demo-user');
              setShell(snapshot.id, newShell);
              registerShell(snapshot.id, 'counter');
            } else {
              const newShell = wrap(counter, 'demo-user');
              setShellWithBubble(snapshot.id, newShell, {
                shellType: 'counter',
                createBubble: false,
              });
              registerShell(snapshot.id, 'counter');
            }
          }
        }
      }
    };

    restoreShells();
  }, [activeWorldLine?.state.id, activeWorldLine?.getCurrentHistoryIndex()]);

  // Counter作成
  const handleCreateCounter = useCallback(async () => {
    const counterId = `counter-${Date.now()}`;
    const counter = new Counter(counterId, 0);
    const shell = wrap(counter, 'demo-user');

    setShellWithBubble(shell.id, shell, {
      shellType: 'counter',
      createBubble: false,
    });

    // 自動同期対象に登録
    registerShell(shell.id, 'counter');

    // 初期状態を記録
    await record(shell, 'counter', 'Counter created');
  }, [setShellWithBubble, registerShell, record]);

  // 世界線の参照位置を移動してShellを復元
  const handleMoveTo = useCallback(async (targetNodeId: string) => {
    if (!activeWorldLine) return;

    // 移動先時点での各オブジェクトのスナップショットを取得
    const snapshots = activeWorldLine.getSnapshotsAt(targetNodeId);

    // 世界線の参照位置を移動
    await moveTo(targetNodeId);

    // スナップショットを使ってIndexedDBから状態を取得し、Shellを復元
    for (const snapshot of snapshots.values()) {
      if (snapshot.type === 'counter') {
        const stateData = await loadState<{ id: string; value: number }>(snapshot);
        if (stateData) {
          const counter = Counter.fromJSON(stateData);
          const existingShell = shells.get(snapshot.id);
          if (existingShell) {
            const newShell = wrap(counter, 'demo-user');
            setShell(snapshot.id, newShell);
          }
        }
      }
    }

    // UIを強制更新
    forceUpdate((n) => n + 1);
  }, [activeWorldLine, moveTo, shells, setShell]);

  // 現在の世界線に存在する Counter の Shell のみ抽出
  const counterShells = Array.from(shells.entries())
    .filter(([id, shell]) => {
      const obj = shell.dangerouslyGetDomainObject();
      // Counter型かどうか
      if (!('value' in obj && 'countUp' in obj)) return false;
      // 世界線に存在するかどうか
      if (!activeWorldLine) return false;
      return activeWorldLine.getCurrentState().hasObject('counter', id);
    })
    .map(([id, shell]) => ({ id, shell: shell as ObjectShell<Counter> }));

  return (
    <div style={styles.container}>
      {/* 左パネル: Counter操作 */}
      <div style={styles.leftPanel}>
        <h1 style={styles.title}>ハッシュ世界線 デモ</h1>

        {/* Counter一覧 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <span>Counters ({counterShells.length})</span>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleCreateCounter}
            >
              + 新規作成
            </button>
          </div>

          {counterShells.length === 0 ? (
            <div style={styles.emptyState}>
              「+ 新規作成」ボタンでCounterを作成してください
            </div>
          ) : (
            <div style={styles.counterGrid}>
              {counterShells.map(({ id, shell }) => (
                <CounterCard
                  key={id}
                  shell={shell}
                />
              ))}
            </div>
          )}
        </div>

        {/* 世界線情報 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <span>アクティブ世界線</span>
          </div>
          {activeWorldLine ? (
            <div style={styles.infoBox}>
              <div>名前: {activeWorldLine.state.name}</div>
              <div>ID: {activeWorldLine.state.id}</div>
              <div>オブジェクト数: {activeWorldLine.getCurrentState().size()}</div>
              <div>履歴数: {activeWorldLine.getHistory().length}</div>
            </div>
          ) : (
            <div style={styles.infoBox}>世界線がありません</div>
          )}
        </div>
      </div>

      {/* 右パネル: 履歴ビューア */}
      <div style={styles.rightPanel}>
        <HistoryPanel
          activeWorldLine={activeWorldLine}
          onMoveTo={handleMoveTo}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 履歴パネル（DAG表示）
// ============================================================================

// 分岐の色パレット
const BRANCH_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

interface HistoryPanelProps {
  activeWorldLine: HashWorldLine | null;
  onMoveTo: (targetNodeId: string) => void;
}

function HistoryPanel({ activeWorldLine, onMoveTo }: HistoryPanelProps) {
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
      <div style={styles.section}>
        <div style={styles.sectionTitle}>履歴</div>
        <div style={styles.infoBox}>世界線がありません</div>
      </div>
    );
  }

  const dagNodes = activeWorldLine.getHistoryDAG();
  const history = activeWorldLine.getHistory();

  // タイムスタンプでソート（新しい順）
  const sortedDagNodes = [...dagNodes].sort((a, b) => b.node.timestamp - a.node.timestamp);

  // 分岐数を計算
  const branchCount = dagNodes.length > 0 ? Math.max(...dagNodes.map((n) => n.branch)) + 1 : 1;

  return (
    <div>
      <div style={{ ...styles.sectionTitle, marginBottom: '16px' }}>
        履歴: {activeWorldLine.state.name}
        <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
          ({history.length} commits{branchCount > 1 ? `, ${branchCount} branches` : ''})
        </span>
      </div>

      {history.length === 0 ? (
        <div style={styles.infoBox}>履歴がありません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {sortedDagNodes.map((dagNode, index) => {
            const { node, branch, isOnCurrentPath, isCurrent } = dagNode;
            const branchColor = BRANCH_COLORS[branch % BRANCH_COLORS.length];

            // このノードの親がどのブランチにいるか
            const parentNode = dagNodes.find(d => d.node.id === node.parentId);
            const parentBranch = parentNode?.branch ?? branch;

            // 分岐点かどうか（親と異なるブランチ）
            const isBranchPoint = parentNode && parentBranch !== branch;

            return (
              <div
                key={node.id}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  minHeight: '44px',
                }}
              >
                {/* Git風のブランチライン */}
                <div
                  style={{
                    width: `${branchCount * 16 + 16}px`,
                    minWidth: '32px',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  {/* 各ブランチの縦線を描画 */}
                  {Array.from({ length: branchCount }).map((_, b) => {
                    // このブランチの線を描画すべきか
                    const shouldDrawLine = sortedDagNodes.some((d, di) => {
                      // このノードより古い（下にある）ノードで、このブランチに属するものがある
                      return di > index && d.branch === b;
                    });

                    if (!shouldDrawLine && b !== branch) return null;

                    const lineColor = BRANCH_COLORS[b % BRANCH_COLORS.length];
                    const isCurrentBranchLine = b === branch;

                    return (
                      <div
                        key={b}
                        style={{
                          position: 'absolute',
                          left: `${b * 16 + 7}px`,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          backgroundColor: lineColor,
                          opacity: isCurrentBranchLine && isOnCurrentPath ? 0.8 : 0.25,
                        }}
                      />
                    );
                  })}

                  {/* 分岐線（親ブランチから分岐する場合） */}
                  {isBranchPoint && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${Math.min(parentBranch, branch) * 16 + 8}px`,
                        bottom: '50%',
                        width: `${Math.abs(parentBranch - branch) * 16}px`,
                        height: '2px',
                        backgroundColor: branchColor,
                        opacity: 0.6,
                      }}
                    />
                  )}

                  {/* コミットポイント */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${branch * 16 + 4}px`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: isCurrent ? '12px' : '8px',
                      height: isCurrent ? '12px' : '8px',
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
                    padding: '6px 8px',
                    backgroundColor: isCurrent ? '#3b3b5c' : isOnCurrentPath ? '#252540' : '#1a1a2e',
                    borderRadius: '4px',
                    opacity: isOnCurrentPath ? 1 : 0.6,
                    cursor: isCurrent ? 'default' : 'pointer',
                    marginBottom: '2px',
                  }}
                  onClick={() => !isCurrent && onMoveTo(node.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

// ============================================================================
// メインページ
// ============================================================================

export default function HashWorldLineDemo() {
  // 型レジストリの初期化
  useEffect(() => {
    registerShellTypes();
  }, []);

  return (
    <ShellManagerProvider>
      <AkashicRecordProvider>
        <DemoContent />
      </AkashicRecordProvider>
    </ShellManagerProvider>
  );
}
