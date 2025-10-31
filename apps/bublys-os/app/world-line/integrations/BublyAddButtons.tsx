'use client';
import { useState, useContext } from 'react';
import { WorldLineContext } from '../WorldLine/domain/WorldLineContext';
import { BublyWorld } from './BublyWorld';
import { CounterBubly } from './CounterBubly';
import { Counter } from '../Counter/domain/Counter';

/**
 * バブリ追加ボタン群コンポーネント
 * WorldLineViewの外でレンダリングされる
 */
export function BublyAddButtons() {
  const { apexWorld, grow } = useContext(WorldLineContext);
  const [nextCounterId, setNextCounterId] = useState(1);
  
  // 新しいCounterバブリを追加
  const handleAddCounter = () => {
    if (!apexWorld) return;
    
    const world = apexWorld.worldState as BublyWorld;
    const newId = `counter-${nextCounterId}`;
    const newCounter = new Counter(0);
    const newCounterBubly = new CounterBubly(newId, newCounter);
    const newWorld = world.setBubly(newId, newCounterBubly);
    grow(newWorld);
    setNextCounterId(nextCounterId + 1);
  };
  
  // 他のバブリタイプを追加するハンドラー
  // const handleAddTimer = () => { ... };
  
  return (
    <div>
      <button
        onClick={handleAddCounter}
        style={{
          padding: '12px 24px',
          backgroundColor: '#4a90e2',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Counter
      </button>
      
      {/* 将来的に他のバブリボタンを追加 */}
      <button
        disabled
        style={{
          padding: '12px 24px',
          backgroundColor: '#ccc',
          color: '#666',
          borderRadius: '8px',
          cursor: 'not-allowed',
        }}
      >
        Timer (未実装)
      </button>
    </div>
  );
}

