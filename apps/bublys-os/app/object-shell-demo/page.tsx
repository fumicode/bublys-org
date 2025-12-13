'use client';

import { useEffect, useState } from 'react';
import { Counter } from '../world-line/Counter/domain/Counter';
import { wrap } from '../object-shell/domain';
import { ShellManagerProvider, useShellManager } from '../object-shell/feature/ShellManager';
import { FocusedObjectProvider } from '../world-line/WorldLine/domain/FocusedObjectContext';
import { registerShellTypes } from '../object-shell/setup/registerShellTypes';
import { BubblesUI } from '../bubble-ui/BubblesUI/feature/BubblesUI';

function ObjectShellDemoContent() {
  const { setShellWithBubble, shells } = useShellManager();
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateShellWithBubble = () => {
    const counter = new Counter(0);
    const shell = wrap(
      `shell-counter-${Date.now()}`,
      counter,
      'demo-user'
    );

    // Bubbleと同時に作成
    setShellWithBubble(shell.id, shell, {
      shellType: 'counter',
      createBubble: true,
      openerBubbleId: 'root',
    });
  };

  const handleCreateShellOnly = () => {
    const counter = new Counter(0);
    const shell = wrap(
      `shell-counter-${Date.now()}`,
      counter,
      'demo-user'
    );

    // Bubbleなしで作成
    setShellWithBubble(shell.id, shell, {
      shellType: 'counter',
      createBubble: false,
    });
  };

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
        🎈 Shell Demo ({shells.size})
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
          🎈 Bubble
        </button>
        <button
          onClick={handleCreateShellOnly}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          📦 Shell
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        Shells: {shells.size}個
      </div>
    </div>
  );
}

export default function ObjectShellDemo() {
  // 型レジストリの初期化
  useEffect(() => {
    registerShellTypes();
  }, []);

  return (
    <FocusedObjectProvider>
      <ShellManagerProvider>
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
        </div>
      </ShellManagerProvider>
    </FocusedObjectProvider>
  );
}
