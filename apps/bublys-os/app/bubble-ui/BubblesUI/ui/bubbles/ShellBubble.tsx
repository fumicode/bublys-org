/**
 * ShellBubble
 * ObjectShellをBubble内でレンダリングする
 */

import { useState } from 'react';
import { BubbleContentRenderer } from '../BubbleContentRenderer';
import { useShell } from '@/app/object-shell/feature/ShellManager';
import { shellTypeRegistry } from '@/app/object-shell/feature/ShellTypeRegistry';

export const ShellBubble: BubbleContentRenderer = ({ bubble }) => {
  const [showHistory, setShowHistory] = useState(false);

  // URL解析: object-shells/counter/shell-counter-001
  const match = bubble.url.match(/^object-shells\/([^/]+)\/(.+)$/);
  const [, shellType, shellId] = match || [];

  // useShell() でShellManagerから取得（状態変更で自動再レンダリング）
  // Hooksは条件分岐の外で呼ぶ必要がある
  const shell = shellId ? useShell(shellId) : undefined;

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP');
  };

  if (!match) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Invalid shell URL</h3>
        <div>URL: {bubble.url}</div>
        <div>Expected format: object-shells/&lt;type&gt;/&lt;shellId&gt;</div>
      </div>
    );
  }

  if (!shell) {
    return (
      <div style={{ padding: '20px', color: 'orange' }}>
        <h3>Shell not found</h3>
        <div>Shell ID: {shellId}</div>
        <div>Type: {shellType}</div>
      </div>
    );
  }

  // 型レジストリからレンダラーを取得
  try {
    const Renderer = shellTypeRegistry.getRenderer(shellType);
    const history = shell.history;

    return (
      <div>
        {/* メインコンテンツ */}
        <Renderer shell={shell} />

        {/* 履歴セクション */}
        <div style={{
          borderTop: '1px solid #ddd',
          marginTop: '16px',
          paddingTop: '8px',
        }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              backgroundColor: showHistory ? '#e3f2fd' : '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>📜 履歴</span>
            <span style={{ fontSize: '11px', color: '#666' }}>
              {history.length}件 {showHistory ? '▼' : '▶'}
            </span>
          </button>

          {showHistory && history.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#fafafa',
              border: '1px solid #eee',
              borderRadius: '4px',
              fontSize: '11px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {history.map((node, index) => (
                <div key={index} style={{
                  padding: '6px',
                  marginBottom: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                }}>
                  <div style={{ color: '#1976d2', fontWeight: 'bold', marginBottom: '2px' }}>
                    {node.action.type}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {formatTimestamp(node.timestamp)}
                    {node.action.meta?.description && ` - ${node.action.meta.description}`}
                  </div>
                  {node.action.payload && (
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                      {JSON.stringify(node.action.payload)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showHistory && history.length === 0 && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              fontSize: '11px',
              color: '#999',
              textAlign: 'center',
            }}>
              履歴がありません
            </div>
          )}
        </div>
      </div>
    );
  } catch {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Unknown shell type</h3>
        <div>Type: {shellType}</div>
        <div>Available types: {shellTypeRegistry.getAllTypeNames().join(', ')}</div>
      </div>
    );
  }
};
