/**
 * ShellBubble
 * ObjectShellをBubble内でレンダリングする
 */

import { useState } from 'react';
import { BubbleContentRenderer } from '../BubbleContentRenderer';
import { useShell, useShellManager, shellTypeRegistry } from '@bublys-org/object-shell';

export const ShellBubble: BubbleContentRenderer = ({ bubble }) => {
  const [showHistory, setShowHistory] = useState(false);
  const { setShell } = useShellManager();

  // URL解析: object-shells/counter/shell-counter-001
  const match = bubble.url.match(/^object-shells\/([^/]+)\/(.+)$/);
  const [, shellType, shellId] = match || [];

  /**
   * useShell() で ShellManager から取得（状態変更で自動再レンダリング）。
   *
   * ★ **条件を付けずに呼ぶ。** 前は `shellId ? useShell(shellId) : undefined` と
   *   書いていて、url が変わって shellId が消えた回だけ hook の数が変わる
   *   ── React は呼ぶ順で hook を見分けるので、これは壊れる。
   *   `useShell` は undefined を渡しても undefined を返す（自分で見ている）。
   */
  const shell = useShell(shellId);

  /**
   * 型レジストリから**描き手**を取り出す。知らない型なら undefined。
   *
   * ★ **JSX を try で包まない。** 前は「取り出し」と「描くもの全部」をまとめて try に
   *   入れていたので、中身のどこかが投げても「知らない型です」と出てしまっていた。
   * ★ 投げる `getRenderer()` ではなく、**登録してあるものを覗く**（`get()?.Renderer`）。
   *   呼んだ結果を部品として使うと「描くたびに部品を作っている」と見なされる
   *   ── 覗いた値なら、登録されたそのものなので毎回同じ（`BubbleContent` と同じ形）。
   */
  const Renderer = shellTypeRegistry.get(shellType)?.Renderer;

  // 履歴の状態に戻す
  const handleRestoreSnapshot = (snapshot: any) => {
    if (!shell || !shellId) return;

    console.log('[ShellBubble] Restoring snapshot:', snapshot);

    // snapshot から新しいドメインオブジェクトを作成
    // 型レジストリから deserializer を取得
    const config = shellTypeRegistry.get(shellType);
    if (!config) return;

    const restoredDomain = config.deserializer(snapshot);

    // Shell を更新（in-place）
    shell.updateDomainObject(
      restoredDomain,
      'RESTORE_SNAPSHOT',
      { snapshot },
      'user',
      '履歴から復元',
      true  // 現在の状態も snapshot として保存
    );

    // ShellManager に変更を通知（React の再レンダリングをトリガー）
    setShell(shellId, shell);

    console.log('[ShellBubble] Snapshot restored:', restoredDomain);
  };

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

  // 知らない型なら、ここで止める（描き手が居ない）
  if (!Renderer) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Unknown shell type</h3>
        <div>Type: {shellType}</div>
        <div>Available types: {shellTypeRegistry.getAllTypeNames().join(', ')}</div>
      </div>
    );
  }

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
              <div
                key={index}
                style={{
                  padding: '6px',
                  marginBottom: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  cursor: node.snapshot ? 'pointer' : 'default',
                }}
                onDoubleClick={() => {
                  if (node.snapshot) {
                    handleRestoreSnapshot(node.snapshot);
                  }
                }}
                title={node.snapshot ? 'ダブルクリックでこの状態に戻す' : ''}
              >
                <div style={{ color: '#1976d2', fontWeight: 'bold', marginBottom: '2px' }}>
                  {node.action.type}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {formatTimestamp(node.timestamp)}
                  {node.action.meta?.description && ` - ${node.action.meta.description}`}
                </div>
                {node.snapshot && (
                  <div style={{
                    fontSize: '11px',
                    color: '#4CAF50',
                    marginTop: '4px',
                    fontWeight: 'bold',
                    backgroundColor: '#f1f8f4',
                    padding: '4px 6px',
                    borderRadius: '3px',
                    display: 'inline-block',
                  }}>
                    📸 前の状態: value = {(node.snapshot as any).value ?? JSON.stringify(node.snapshot)}
                  </div>
                )}
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
};
