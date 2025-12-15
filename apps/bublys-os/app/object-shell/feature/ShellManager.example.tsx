/**
 * ShellManagerの使用例
 */

import { Counter } from '../../world-line/Counter/domain/Counter';
import { wrap } from '../domain';
import { useShell, useShellManager, useShellUpdater } from './ShellManager';

// ============================================
// 例1: 基本的な使い方
// ============================================

export function BasicExample() {
  const { setShell } = useShellManager();

  const handleCreateCounter = () => {
    // 1. ドメインオブジェクトを作成
    const counterId = 'counter-' + Date.now();
    const counter = new Counter(counterId, 0);

    // 2. シェルでラップ
    const shell = wrap(counter, 'user-001');

    // 3. メモリに保存
    setShell(shell.id, shell);

    console.log('Created shell:', shell.id);
  };

  return (
    <div>
      <button onClick={handleCreateCounter}>Create Counter Shell</button>
    </div>
  );
}

// ============================================
// 例2: シェルを使ったカウンター
// ============================================

export function CounterWithShell({ shellId }: { shellId: string }) {
  const shell = useShell<Counter>(shellId);
  const updateShell = useShellUpdater<Counter>(shellId);

  if (!shell) return <div>Loading...</div>;

  const handleIncrement = () => {
    // 🎉 新API: Proxy版なら1行で完結！
    updateShell((currentShell) => currentShell.countUp());
  };

  const handleDecrement = () => {
    // 🎉 新API: Proxy版なら1行で完結！
    updateShell((currentShell) => currentShell.countDown());
  };

  return (
    <div>
      <h2>Counter: {shell.value}</h2>
      <button onClick={handleIncrement}>+</button>
      <button onClick={handleDecrement}>-</button>
    </div>
  );
}

// ============================================
// 例3: 履歴の表示
// ============================================

export function HistoryView({ shellId }: { shellId: string }) {
  const shell = useShell(shellId);

  if (!shell) return null;

  // ✨ shell.history は配列を返す
  const history = shell.history;

  return (
    <div>
      <h3>履歴</h3>
      <ul>
        {history.map((node, idx) => (
          <li key={idx}>
            {node.action.type}
            {node.action.meta?.description && ` - ${node.action.meta.description}`}
            <br />
            <small>{new Date(node.timestamp).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// 例4: 永続化
// ============================================

export function PersistenceControls() {
  const { saveToStorage, loadFromStorage, getAllShellIds } = useShellManager();

  return (
    <div>
      <button onClick={saveToStorage}>💾 保存</button>
      <button onClick={loadFromStorage}>📂 読み込み</button>
      <div>保存済みシェル数: {getAllShellIds().length}</div>
    </div>
  );
}

// ============================================
// 例5: 複数のViewで同じシェルを表示
// ============================================

export function MultiViewExample({ shellId }: { shellId: string }) {
  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>View 1</h3>
        <CounterWithShell shellId={shellId} />
      </div>

      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>View 2</h3>
        <CounterWithShell shellId={shellId} />
      </div>

      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>履歴</h3>
        <HistoryView shellId={shellId} />
      </div>
    </div>
  );
}

// ============================================
// 例6: アプリケーションルート
// ============================================

import { ShellManagerProvider } from './ShellManager';

export function App() {
  return (
    <ShellManagerProvider>
      <div>
        <h1>Object Shell Demo</h1>
        <BasicExample />
        <PersistenceControls />
        {/* 他のコンポーネント */}
      </div>
    </ShellManagerProvider>
  );
}
