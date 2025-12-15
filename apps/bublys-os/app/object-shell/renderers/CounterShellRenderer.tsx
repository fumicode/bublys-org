/**
 * CounterShellRenderer
 * Counter型のObjectShellをBubble内で表示するレンダラー
 */

import { FC } from 'react';
import { Counter } from '../../world-line/Counter/domain/Counter';
import { ObjectShell } from '../domain';
import { useShellManager } from '../feature/ShellManager';
import { useHashWorldLineShellBridge } from '../../hash-world-line';

export const CounterShellRenderer: FC<{ shell: ObjectShell<Counter> }> = ({ shell }) => {
  const { setShell } = useShellManager();
  const { syncShellToWorldLine } = useHashWorldLineShellBridge();

  const handleIncrement = () => {
    const newShell = shell.countUp();
    setShell(shell.id, newShell);
    // 世界線に同期
    syncShellToWorldLine(newShell, 'counter', `Counter incremented to ${newShell.value}`);
  };

  const handleDecrement = () => {
    const newShell = shell.countDown();
    setShell(shell.id, newShell);
    // 世界線に同期
    syncShellToWorldLine(newShell, 'counter', `Counter decremented to ${newShell.value}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Counter Shell</h3>
      <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
        {shell.value}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={handleIncrement}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          +1
        </button>
        <button
          onClick={handleDecrement}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          -1
        </button>
      </div>
      <div style={{ fontSize: '12px', color: '#666', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <div>Shell ID: {shell.id}</div>
        <div>History: {shell.history.length} actions</div>
        <div>Owner: {shell.metadata.permissions.owner}</div>
      </div>
    </div>
  );
};
