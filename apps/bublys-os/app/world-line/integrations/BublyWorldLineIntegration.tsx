'use client';
import { useState } from 'react';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { CounterView } from '../Counter/ui/CounterView';
import { BublyWorld } from './BublyWorld';
import { CounterBubly } from './CounterBubly';
import { Counter } from '../Counter/domain/Counter';
import { BaseBubly } from './BaseBubly';

/**
 * バブリのビューコンポーネント
 */
function BublyView({ 
  bubly, 
  onBublyChange, 
  onRemove 
}: { 
  bubly: BaseBubly; 
  onBublyChange: (newBubly: BaseBubly) => void;
  onRemove: () => void;
}) {
  // バブリのタイプに応じて適切なビューを表示
  if (bubly.type === 'counter') {
    const counterBubly = bubly as CounterBubly;
    return (
      <div 
        style={{
          border: '2px solid #4a90e2',
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#f0f7ff',
          position: 'relative',
        }}
      >
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <div style={{
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#2c5aa0',
          }}>
            📊 Counter: {counterBubly.id}
          </div>
          <button
            onClick={onRemove}
            style={{
              padding: '4px 12px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            削除
          </button>
        </div>
        <CounterView
          counter={counterBubly.counter}
          onCounterChange={(newCounter: Counter) => {
            const newBubly = counterBubly.updateCounter(newCounter);
            onBublyChange(newBubly);
          }}
        />
      </div>
    );
  }
  
  // 他のバブリタイプはここに追加
  // if (bubly.type === 'timer') { ... }
  
  return (
    <div style={{ padding: '20px', color: '#999' }}>
      Unknown bubly type: {bubly.type}
    </div>
  );
}

/**
 * BublyWorldとWorldLineの統合層
 * 動的にバブリを追加・削除できる
 */
export function BublyWorldLineIntegration() {
  const [nextCounterId, setNextCounterId] = useState(1);
  
  return (
    <WorldLineView<BublyWorld>
      renderWorldState={(world: BublyWorld, onWorldChange) => {
        const bublies = world.getAllBublies();
        
        // 新しいCounterバブリを追加
        const handleAddCounter = () => {
          const newId = `counter-${nextCounterId}`;
          const newCounter = new Counter(0);
          const newCounterBubly = new CounterBubly(newId, newCounter);
          const newWorld = world.setBubly(newId, newCounterBubly);
          onWorldChange(newWorld);
          setNextCounterId(nextCounterId + 1);
        };
        
        // 他のバブリタイプを追加するハンドラー
        // const handleAddTimer = () => { ... };
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* バブリ追加ボタン群 */}
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '20px',
              backgroundColor: '#f5f5f5',
              borderRadius: '12px',
              border: '2px dashed #ccc',
            }}>
              <div style={{ 
                flex: 1,
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                color: '#666',
              }}>
                🚀 バブリを追加：
              </div>
              <button
                onClick={handleAddCounter}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                ➕ Counter
              </button>
              
              {/* 将来的に他のバブリボタンを追加 */}
              <button
                disabled
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ccc',
                  color: '#666',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                ⏱️ Timer (未実装)
              </button>
            </div>
            
            {/* バブリ一覧 */}
            {bublies.length === 0 ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#999',
                fontSize: '16px',
              }}>
                バブリがありません。上のボタンからバブリを追加してください。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bublies.map((bubly) => (
                  <BublyView
                    key={bubly.id}
                    bubly={bubly}
                    onBublyChange={(newBubly: BaseBubly) => {
                      const newWorld = world.setBubly(bubly.id, newBubly);
                      onWorldChange(newWorld);
                    }}
                    onRemove={() => {
                      const newWorld = world.removeBubly(bubly.id);
                      onWorldChange(newWorld);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

