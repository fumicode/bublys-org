'use client';

import { useState } from 'react';
import { Counter } from '../world-line/Counter/domain/Counter';
import {
  wrap,
  type ObjectShell,
} from '../object-shell/domain';

export default function ObjectShellDemo() {
  // ObjectShell（Proxy版）
  const [counterShell, setCounterShell] = useState<ObjectShell<Counter>>(() =>
    wrap('demo-counter', new Counter(0), 'demo-user')
  );

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleCountUp = () => {
    const newShell = counterShell.countUp();
    setCounterShell(newShell);
    addLog(`カウントアップ: ${counterShell.value} → ${newShell.value}`);
  };

  const handleCountDown = () => {
    const newShell = counterShell.countDown();
    setCounterShell(newShell);
    addLog(`カウントダウン: ${counterShell.value} → ${newShell.value}`);
  };

  const handleAddView = () => {
    const newShell = counterShell.addViewReference({
      viewId: `view-${Date.now()}`,
      viewType: 'demo',
      position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 },
    });
    setCounterShell(newShell);
    addLog(`View追加: 合計${newShell.metadata.views.length}個`);
  };

  const handleShowHistory = () => {
    // ✨ shell.history は配列を返すので、getHistoryAsArray() 不要！
    const history = counterShell.history;
    console.log('=== オブジェクトシェル履歴 ===');
    history.forEach((node, idx) => {
      console.log(`${idx + 1}. ${node.action.type}`, {
        payload: node.action.payload,
        meta: node.action.meta,
        timestamp: new Date(node.timestamp).toLocaleString(),
      });
    });
    addLog(`履歴をコンソールに出力（${history.length}件）`);
  };

  const handleShowMetadata = () => {
    console.log('=== オブジェクトシェル メタデータ ===', {
      id: counterShell.id,
      views: counterShell.metadata.views,
      permissions: counterShell.metadata.permissions,
      createdAt: new Date(counterShell.metadata.createdAt).toLocaleString(),
      updatedAt: new Date(counterShell.metadata.updatedAt).toLocaleString(),
    });
    addLog('メタデータをコンソールに出力');
  };

  const handleSerialize = () => {
    const json = counterShell.toJson(
      (counter) => counter.toJson(),
      (counter) => counter.toJson()
    );
    console.log('=== シリアライズ結果 ===', json);
    addLog('JSON形式でコンソールに出力');
  };

  // ✨ shell.history は配列を返す
  const history = counterShell.history;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>オブジェクトシェル デモ</h1>

      <div style={{ marginBottom: '20px', padding: '15px', border: '2px solid #333', borderRadius: '8px' }}>
        <h2>現在の状態</h2>
        <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0' }}>
          {counterShell.value}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <div>ID: {counterShell.id}</div>
          <div>履歴: {history.length}件</div>
          <div>View: {counterShell.metadata.views.length}個</div>
          <div>所有者: {counterShell.metadata.permissions.owner}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>操作</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCountUp}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            ➕ カウントアップ
          </button>
          <button
            onClick={handleCountDown}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            ➖ カウントダウン
          </button>
          <button
            onClick={handleAddView}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            👁️ View追加
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>確認</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleShowHistory}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            📜 履歴を表示
          </button>
          <button
            onClick={handleShowMetadata}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            ℹ️ メタデータ表示
          </button>
          <button
            onClick={handleSerialize}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            💾 シリアライズ
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>履歴（最新5件）</h2>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {history.length === 0 ? (
            <div style={{ color: '#999' }}>履歴がありません</div>
          ) : (
            history.slice(0, 5).map((node, idx) => (
              <div key={idx} style={{ marginBottom: '5px', fontSize: '12px' }}>
                <strong>{node.action.type}</strong>
                {node.action.meta?.description && ` - ${node.action.meta.description}`}
                {node.action.payload && (
                  <span style={{ color: '#666' }}> (payload: {JSON.stringify(node.action.payload)})</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>View一覧（このオブジェクトが表示されている場所）</h2>
        <div
          style={{
            backgroundColor: '#f0f8ff',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {counterShell.metadata.views.length === 0 ? (
            <div style={{ color: '#999' }}>Viewがありません</div>
          ) : (
            counterShell.metadata.views.map((view, idx) => (
              <div
                key={view.viewId}
                style={{
                  padding: '8px',
                  marginBottom: '5px',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {idx + 1}. {view.viewType.toUpperCase()} - {view.viewId}
                </div>
                {view.position && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    位置: x={view.position.x.toFixed(1)}, y={view.position.y.toFixed(1)}, z={view.position.z}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2>ログ</h2>
        <div
          style={{
            backgroundColor: '#000',
            color: '#0f0',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
          }}
        >
          {logs.length === 0 ? (
            <div>ログがありません</div>
          ) : (
            logs.map((log, idx) => <div key={idx}>{log}</div>)
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffffcc', borderRadius: '4px' }}>
        <strong>💡 ヒント:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>ブラウザのコンソール（F12）を開いて、「履歴を表示」や「メタデータ表示」ボタンをクリックすると詳細が確認できます</li>
          <li><strong>View追加</strong>は、このオブジェクトが複数の場所（バブル、モーダル、パネルなど）で表示されている時の関連付けを記録します</li>
          <li>実際のアプリでは、同じCounterが画面上の複数のウィンドウで表示される時に、それぞれの位置や種類を記録できます</li>
          <li><strong>Proxyパターン</strong>により、<code>counterShell.countUp()</code>のようにドメインメソッドを直接呼び出せます</li>
          <li>すべての操作は自動的に履歴に記録され、不変性が保たれます</li>
        </ul>
      </div>
    </div>
  );
}
