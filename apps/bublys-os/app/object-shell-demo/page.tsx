'use client';

import { useState } from 'react';
import { Counter } from '../world-line/Counter/domain/Counter';
import {
  wrap,
  wrapBase,
  addViewReference,
  type ObjectShell,
  type ObjectShellBase,
} from '../object-shell/domain';

export default function ObjectShellDemo() {
  // 旧API（ObjectShellBase直接使用） - 2行パターン
  const [counterShell, setCounterShell] = useState<ObjectShellBase<Counter>>(() =>
    wrapBase('demo-counter', new Counter(0), 'demo-user')
  );

  // 新API（Proxy版） - 1行で完結
  const [facadeCounter, setFacadeCounter] = useState<ObjectShell<Counter>>(() =>
    wrap('facade-counter', new Counter(0), 'demo-user')
  );

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleCountUp = () => {
    const newCounter = counterShell.domainObject.countUp();
    const newShell = counterShell.updateDomainObject(
      newCounter,
      'counter/increment',
      { amount: 1 },
      'demo-user',
      'カウントアップ'
    );
    setCounterShell(newShell);
    addLog(`カウントアップ: ${counterShell.domainObject.value} → ${newCounter.value}`);
  };

  const handleCountDown = () => {
    const newCounter = counterShell.domainObject.countDown();
    const newShell = counterShell.updateDomainObject(
      newCounter,
      'counter/decrement',
      { amount: 1 },
      'demo-user',
      'カウントダウン'
    );
    setCounterShell(newShell);
    addLog(`カウントダウン: ${counterShell.domainObject.value} → ${newCounter.value}`);
  };

  const handleAddView = () => {
    const metadata = addViewReference(counterShell.metadata, {
      viewId: `view-${Date.now()}`,
      viewType: 'demo',
      position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 },
    });
    const newShell = counterShell.updateMetadata({ views: metadata.views });
    setCounterShell(newShell);
    addLog(`View追加: 合計${metadata.views.length}個`);
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

  // Facadeパターンのハンドラー
  const handleFacadeCountUp = () => {
    // 🎉 1行で完結！Proxyが自動的にshellを更新して返す
    const newFacade = facadeCounter.countUp();
    setFacadeCounter(newFacade);
    addLog(`[Facade] カウントアップ: ${(facadeCounter as any).value} → ${(newFacade as any).value}`);
  };

  const handleFacadeCountDown = () => {
    // 🎉 1行で完結！
    const newFacade = facadeCounter.countDown();
    setFacadeCounter(newFacade);
    addLog(`[Facade] カウントダウン: ${(facadeCounter as any).value} → ${(newFacade as any).value}`);
  };

  // ✨ shell.history は配列を返す
  const history = counterShell.history;
  const facadeHistory = facadeCounter.history;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>オブジェクトシェル デモ</h1>

      <div style={{ marginBottom: '20px', padding: '15px', border: '2px solid #333', borderRadius: '8px' }}>
        <h2>現在の状態</h2>
        <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0' }}>
          {counterShell.domainObject.value}
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

      {/* Proxy版デモ */}
      <div style={{ marginTop: '40px', padding: '20px', border: '3px solid #4CAF50', borderRadius: '8px', backgroundColor: '#f0fff0' }}>
        <h2 style={{ color: '#2E7D32' }}>🎉 新API：ObjectShell（Proxy実装）</h2>
        <p style={{ marginBottom: '15px' }}>
          Proxyを使ってShellがドメインオブジェクトのメソッドを透過的に公開します。<br />
          <code style={{ backgroundColor: '#e8f5e9', padding: '2px 6px', borderRadius: '3px' }}>
            facadeCounter.countUp()
          </code>{' '}
          のように、まるでCounterのメソッドを直接呼んでいるように見えます！
        </p>

        <div style={{ marginBottom: '20px', padding: '15px', border: '2px solid #66BB6A', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Facade Counter</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0', color: '#2E7D32' }}>
            {facadeCounter.domainObject.value}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <div>ID: {facadeCounter.id}</div>
            <div>履歴: {facadeHistory.length}件</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>操作（新API - Proxy版）</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleFacadeCountUp}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              ➕ CountUp（1行で完結）
            </button>
            <button
              onClick={handleFacadeCountDown}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              ➖ CountDown（1行で完結）
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Proxy版履歴（最新5件）</h3>
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '150px',
            overflowY: 'auto',
          }}>
            {facadeHistory.length === 0 ? (
              <div style={{ color: '#999' }}>履歴がありません</div>
            ) : (
              facadeHistory.slice(0, 5).map((node, idx) => (
                <div key={idx} style={{ marginBottom: '5px', fontSize: '12px' }}>
                  <strong style={{ color: '#2E7D32' }}>{node.action.type}</strong>
                  {node.action.meta?.description && ` - ${node.action.meta.description}`}
                  {node.action.payload && (
                    <span style={{ color: '#666' }}> (payload: {JSON.stringify(node.action.payload)})</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
          <strong>✨ 新API（Proxy版）の特徴:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li><code>facadeCounter.countUp()</code> - まるでCounterのメソッドのように見える</li>
            <li>Proxyが自動的に <code>updateDomainObject()</code> を呼び出して履歴を記録</li>
            <li>TypeScript上も <code>ObjectShell&lt;Counter&gt;</code> 型で、Counterのメソッドが補完される</li>
            <li>ボイラープレート不要で、すべてのドメインオブジェクトで使える</li>
            <li><strong>wrap()がデフォルトでProxy版を返すので、これが標準になります！</strong></li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffffcc', borderRadius: '4px' }}>
        <strong>💡 ヒント:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>ブラウザのコンソール（F12）を開いて、「履歴を表示」や「メタデータ表示」ボタンをクリックすると詳細が確認できます</li>
          <li><strong>View追加</strong>は、このオブジェクトが複数の場所（バブル、モーダル、パネルなど）で表示されている時の関連付けを記録します</li>
          <li>実際のアプリでは、同じCounterが画面上の複数のウィンドウで表示される時に、それぞれの位置や種類を記録できます</li>
          <li><strong>旧API（2行パターン）と新API（1行パターン）を比較</strong>して、コードの簡潔さを実感してください！</li>
          <li><strong>今後はwrap()がデフォルトでProxy版を返します</strong> - 既存コードも徐々に移行できます</li>
        </ul>
      </div>
    </div>
  );
}
