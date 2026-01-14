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
  counterHistory: {
    marginTop: '12px',
    padding: '8px',
    backgroundColor: '#1a1a2e',
    borderRadius: '4px',
    textAlign: 'left' as const,
  },
  historyTitle: {
    fontSize: '10px',
    color: '#8b5cf6',
    marginBottom: '6px',
    fontWeight: 600,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#888',
  },
  historyValue: {
    fontWeight: 'bold',
    color: '#fff',
    minWidth: '24px',
  },
  historyHash: {
    fontFamily: 'monospace',
    color: '#10b981',
    fontSize: '9px',
  },
  historyTime: {
    color: '#666',
  },
  commandSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    border: '1px solid #3b3b5c',
  },
  commandInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    fontFamily: "'SF Mono', 'Monaco', monospace",
    backgroundColor: '#252540',
    border: '1px solid #3b3b5c',
    borderRadius: '4px',
    color: '#e0e0e0',
    outline: 'none',
  },
};

// ============================================================================
// Counter カード コンポーネント
// ============================================================================

interface CounterCardProps {
  shell: ObjectShell<Counter>;
  activeWorldLine: HashWorldLine | null;
}

interface HistoryWithValue {
  nodeId: string;
  hash: string;
  timestamp: number;
  value: number | null;
}

function CounterCard({ shell, activeWorldLine }: CounterCardProps) {
  const { setShell } = useShellManager();
  const [historyWithValues, setHistoryWithValues] = useState<HistoryWithValue[]>([]);

  const handleIncrement = () => {
    shell.countUp();
    setShell(shell.id, shell);
  };

  const handleDecrement = () => {
    shell.countDown();
    setShell(shell.id, shell);
  };

  // 現在の経路（HEAD から遡る）上で、このカウンターに関連する履歴を抽出
  const counterHistory = (() => {
    if (!activeWorldLine) return [];

    const currentNode = activeWorldLine.getCurrentHistoryNode();
    if (!currentNode) return [];

    // HEAD からルートまでの経路を取得
    const path = activeWorldLine.getPathTo(currentNode.id);

    // その経路上で、このカウンターを変更したノードだけ抽出
    return path.filter((node) =>
      node.changedObjects.some((obj) => obj.id === shell.id)
    );
  })();

  // 履歴の値を非同期で取得
  useEffect(() => {
    const fetchValues = async () => {
      const recentHistory = counterHistory.slice(-5);
      const results: HistoryWithValue[] = [];

      for (const node of recentHistory) {
        const snapshot = node.changedObjects.find((obj) => obj.id === shell.id);
        if (snapshot) {
          const stateData = await loadState<{ id: string; value: number }>(snapshot);
          results.push({
            nodeId: node.id,
            hash: snapshot.hash,
            timestamp: node.timestamp,
            value: stateData?.value ?? null,
          });
        }
      }

      setHistoryWithValues(results.reverse());
    };

    fetchValues();
  }, [counterHistory.length, shell.id]);

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

      {/* 履歴表示 */}
      {historyWithValues.length > 0 && (
        <div style={styles.counterHistory}>
          <div style={styles.historyTitle}>履歴 ({counterHistory.length})</div>
          <div style={styles.historyList}>
            {historyWithValues.map((item) => (
              <div key={item.nodeId} style={styles.historyItem}>
                <span style={styles.historyValue}>
                  {item.value !== null ? item.value : '?'}
                </span>
                <span style={styles.historyHash}>{item.hash.slice(0, 8)}</span>
                <span style={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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

        {/* コマンド入力 */}
        <CommandInput
          shells={new Map(counterShells.map(({ id, shell }) => [id, shell]))}
          onExecute={() => forceUpdate((n) => n + 1)}
        />

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
                  activeWorldLine={activeWorldLine}
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

        {/* 現在の世界の内容 */}
        {activeWorldLine && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span>現在の世界の状態</span>
            </div>
            <WorldStateView worldLine={activeWorldLine} />
          </div>
        )}
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
// コマンド入力（LLM 操作シミュレーション）
// ============================================================================

interface CommandInputProps {
  shells: Map<string, ObjectShell<Counter>>;
  onExecute: () => void;
}

function CommandInput({ shells, onExecute }: CommandInputProps) {
  const [input, setInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'natural' | 'code'>('natural');
  const { setShell } = useShellManager();
  const { record } = useAkashicRecord();

  // シェルIDを JS 識別子に変換（- → _）
  const toJsId = (id: string) => id.replace(/-/g, '_');

  // 利用可能なシェル（JS識別子形式）
  const shellEntries = Array.from(shells.entries()).map(([id, shell]) => ({
    id,
    jsId: toJsId(id),
    shell,
  }));

  // 自然言語 → コード変換 → 即実行
  const generateAndExecute = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setResult(null);
    setGeneratedCode(null);

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          availableObjects: shellEntries.map((e) => ({
            name: e.jsId,
            type: 'counter',
            methods: ['countUp', 'countDown', 'reset'],
            currentValue: e.shell.value,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setResult(`Error: ${data.error}`);
        return;
      }

      // 生成されたコードを表示して即実行
      setGeneratedCode(data.code);
      await executeCode(data.code, false);
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // コードを実行
  const executeCode = async (code: string, clearInput = true) => {
    if (!code.trim()) return;

    try {
      const argNames = shellEntries.map((e) => e.jsId);
      const argValues = shellEntries.map((e) => e.shell);

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(...argNames, code);
      fn(...argValues);

      for (const { id, shell } of shellEntries) {
        setShell(id, shell);
        await record(shell, 'counter', `LLM: ${code}`);
      }

      setResult(`OK: ${code}`);
      if (clearInput) {
        setInput('');
      }
      onExecute();
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'natural') {
      await generateAndExecute();
    } else {
      await executeCode(input);
    }
  };

  // シェル一覧（JS識別子形式）
  const shellList = shellEntries.map((e) => e.jsId);

  return (
    <div style={styles.commandSection}>
      <div style={styles.sectionTitle}>
        <span>LLM 操作</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setMode('natural')}
            style={{
              ...styles.button,
              padding: '4px 8px',
              fontSize: '10px',
              ...(mode === 'natural' ? styles.primaryButton : { backgroundColor: '#3b3b5c' }),
            }}
          >
            自然言語
          </button>
          <button
            onClick={() => setMode('code')}
            style={{
              ...styles.button,
              padding: '4px 8px',
              fontSize: '10px',
              ...(mode === 'code' ? styles.primaryButton : { backgroundColor: '#3b3b5c' }),
            }}
          >
            コード
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '8px', fontSize: '11px', color: '#888' }}>
        利用可能: {shellList.length > 0 ? shellList.join(', ') : 'なし'}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSubmit()}
          placeholder={
            mode === 'natural'
              ? '例: カウンターを3回増やして'
              : '例: counter_123.countUp()'
          }
          style={styles.commandInput}
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          style={{ ...styles.button, ...styles.primaryButton }}
          disabled={isLoading}
        >
          {isLoading ? '...' : mode === 'natural' ? '変換' : '実行'}
        </button>
      </div>

      {/* 生成されたコード */}
      {generatedCode && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#252540',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
            生成されたコード:
          </div>
          <div
            style={{
              fontFamily: "'SF Mono', 'Monaco', monospace",
              fontSize: '12px',
              color: '#10b981',
              marginBottom: '8px',
            }}
          >
            {generatedCode}
          </div>
          <button
            onClick={() => executeCode(generatedCode)}
            style={{ ...styles.button, ...styles.successButton }}
          >
            このコードを実行
          </button>
        </div>
      )}

      {/* 結果 */}
      {result && (
        <div
          style={{
            padding: '8px',
            backgroundColor: result.startsWith('OK') ? '#10b98120' : '#ef444420',
            borderRadius: '4px',
            fontSize: '11px',
            color: result.startsWith('OK') ? '#10b981' : '#ef4444',
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 現在の世界の状態表示
// ============================================================================

interface WorldStateViewProps {
  worldLine: HashWorldLine;
}

function WorldStateView({ worldLine }: WorldStateViewProps) {
  const [objectValues, setObjectValues] = useState<
    Array<{ key: string; type: string; id: string; hash: string; value: unknown }>
  >([]);

  const currentState = worldLine.getCurrentState();
  const snapshots = currentState.getAllSnapshots();

  useEffect(() => {
    const fetchValues = async () => {
      const results: Array<{
        key: string;
        type: string;
        id: string;
        hash: string;
        value: unknown;
      }> = [];

      for (const snapshot of snapshots) {
        const stateData = await loadState(snapshot);
        results.push({
          key: `${snapshot.type}:${snapshot.id}`,
          type: snapshot.type,
          id: snapshot.id,
          hash: snapshot.hash,
          value: stateData,
        });
      }

      setObjectValues(results);
    };

    fetchValues();
  }, [snapshots.length, worldLine.getCurrentHistoryIndex()]);

  if (snapshots.length === 0) {
    return <div style={styles.infoBox}>オブジェクトがありません</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {objectValues.map((obj) => (
        <div
          key={obj.key}
          style={{
            padding: '8px 12px',
            backgroundColor: '#252540',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{obj.type}</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace' }}>
              {obj.hash.slice(0, 12)}...
            </span>
          </div>
          <div style={{ color: '#888', fontSize: '10px', wordBreak: 'break-all' }}>
            {obj.id}
          </div>
          <div style={{ color: '#fff', marginTop: '4px' }}>
            {obj.type === 'counter' && typeof obj.value === 'object' && obj.value !== null
              ? `value: ${(obj.value as { value: number }).value}`
              : JSON.stringify(obj.value)}
          </div>
        </div>
      ))}
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
