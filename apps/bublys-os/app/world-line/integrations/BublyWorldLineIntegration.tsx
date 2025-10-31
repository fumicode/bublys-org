'use client';
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
          padding: '10px',
          backgroundColor: '#f0f7ff',
          position: 'relative',
        }}
      >
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            fontWeight: 'bold', 
            color: '#2c5aa0',
          }}>
            Counter: {counterBubly.id}
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
  return (
    <WorldLineView<BublyWorld>
      renderWorldState={(world: BublyWorld, onWorldChange) => {
        const bublies = world.getAllBublies();
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* バブリ一覧 */}
            {bublies.length === 0 ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#999',
                fontSize: '16px',
              }}>
                バブリがありません。バブリ追加ボタンからバブリを追加してください。
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
