/**
 * ShellListPanel
 * 全Shellを一覧表示し、管理するパネル
 */

import { FC, useState, CSSProperties } from 'react';
import { useShellManager } from '../feature/ShellManager';

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '12px',
    fontFamily: "'SF Mono', 'Monaco', monospace",
    fontSize: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontWeight: 600,
    color: '#333',
  },
  count: {
    fontSize: '11px',
    color: '#888',
  },
  list: {
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  shellItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    marginBottom: '4px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '11px',
  },
  shellInfo: {
    flex: 1,
    minWidth: 0,
  },
  shellId: {
    fontWeight: 500,
    color: '#333',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  shellMeta: {
    fontSize: '10px',
    color: '#888',
    marginTop: '2px',
  },
  shellType: {
    display: 'inline-block',
    padding: '1px 4px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '2px',
    fontSize: '9px',
    marginRight: '4px',
  },
  deleteBtn: {
    padding: '4px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    borderRadius: '3px',
    marginLeft: '8px',
  },
  deleteBtnHover: {
    backgroundColor: '#ffcdd2',
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#999',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  filterBtn: {
    padding: '4px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    border: '1px solid #ddd',
    borderRadius: '3px',
    backgroundColor: 'white',
  },
  filterBtnActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
    color: '#1976d2',
  },
  bulkActions: {
    borderTop: '1px solid #eee',
    paddingTop: '8px',
    marginTop: '8px',
  },
  dangerBtn: {
    padding: '6px 12px',
    fontSize: '11px',
    cursor: 'pointer',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
  },
};

interface ShellListPanelProps {
  onClose?: () => void;
}

export const ShellListPanel: FC<ShellListPanelProps> = ({ onClose }) => {
  const { shells, removeShell, clearAll, getShellType } = useShellManager();
  const [filterType, setFilterType] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Shell配列に変換
  const shellEntries = Array.from(shells.entries());

  // 型でフィルタリング
  const filteredShells = filterType
    ? shellEntries.filter(([id]) => getShellType(id) === filterType)
    : shellEntries;

  // 型の一覧を取得
  const types = new Set<string>();
  shellEntries.forEach(([id]) => {
    const type = getShellType(id);
    if (type) types.add(type);
  });

  const handleDelete = (shellId: string) => {
    if (window.confirm(`Shell "${shellId}" を削除しますか？\n関連するBubbleも削除されます。`)) {
      removeShell(shellId);
    }
  };

  const handleClearAll = () => {
    if (confirmClearAll) {
      clearAll();
      setConfirmClearAll(false);
    } else {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000);
    }
  };

  const formatValue = (shell: any): string => {
    try {
      const domain = shell.dangerouslyGetDomainObject();
      if ('value' in domain) return `value: ${domain.value}`;
      if ('name' in domain) return `name: ${domain.name}`;
      return '';
    } catch {
      return '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Shell一覧</span>
        <span style={styles.count}>{shells.size}個</span>
      </div>

      {/* フィルターバー */}
      {types.size > 0 && (
        <div style={styles.filterBar}>
          <button
            style={{
              ...styles.filterBtn,
              ...(filterType === null ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilterType(null)}
          >
            すべて ({shellEntries.length})
          </button>
          {Array.from(types).map((type) => {
            const count = shellEntries.filter(([id]) => getShellType(id) === type).length;
            return (
              <button
                key={type}
                style={{
                  ...styles.filterBtn,
                  ...(filterType === type ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilterType(type)}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Shell一覧 */}
      <div style={styles.list}>
        {filteredShells.length === 0 ? (
          <div style={styles.emptyState}>
            {shells.size === 0 ? 'Shellがありません' : '該当するShellがありません'}
          </div>
        ) : (
          filteredShells.map(([id, shell]) => {
            const type = getShellType(id) || 'unknown';
            const valueStr = formatValue(shell);
            const historyCount = shell.history?.length ?? 0;

            return (
              <div key={id} style={styles.shellItem}>
                <div style={styles.shellInfo}>
                  <div style={styles.shellId}>{id}</div>
                  <div style={styles.shellMeta}>
                    <span style={styles.shellType}>{type}</span>
                    {valueStr && <span>{valueStr}</span>}
                    {historyCount > 0 && <span> | 履歴: {historyCount}件</span>}
                  </div>
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(id)}
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 一括操作 */}
      {shells.size > 0 && (
        <div style={styles.bulkActions}>
          <button
            style={{
              ...styles.dangerBtn,
              backgroundColor: confirmClearAll ? '#d32f2f' : '#f44336',
            }}
            onClick={handleClearAll}
          >
            {confirmClearAll ? '本当に全削除する？' : '全Shell削除'}
          </button>
        </div>
      )}
    </div>
  );
};
