'use client';
import { CounterWorldLineIntegration } from './integrations/CounterWorldLineIntegration';
import { CounterWorldLineManager } from './integrations/CounterWorldLineManager';

export default function Index() {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '2rem', 
      padding: '2rem',
      flexWrap: 'wrap'
    }}>
      {/* Counter1: 独立した世界線 */}
      <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
        <CounterWorldLineManager counterId="counter-1" initialValue={100}>
          <CounterWorldLineIntegration counterId="counter-1" />
        </CounterWorldLineManager>
      </div>
      
      {/* Counter2: 独立した世界線 */}
      <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
        <CounterWorldLineManager counterId="counter-2" initialValue={200}>
          <CounterWorldLineIntegration counterId="counter-2" />
        </CounterWorldLineManager>
      </div>
    </div>
  );
}
