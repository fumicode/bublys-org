'use client';
import { CounterWorldLineIntegration } from './integrations/CounterWorldLineIntegration';
import { CounterWorldLineManager } from './integrations/CounterWorldLineManager';

export default function Index() {
  return (
    <div>
      {/* Counter1: 独立した世界線 */}
      <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
        <CounterWorldLineManager counterId="counter-1" initialValue={100}>
          <CounterWorldLineIntegration />
        </CounterWorldLineManager>
      </div>
      
      {/* Counter2: 独立した世界線 */}
      {/* <div style={{ flex: '1 1 400px', minWidth: '400px' }}>
        <CounterWorldLineManager counterId="counter-2" initialValue={200}>
          <CounterWorldLineIntegration />
        </CounterWorldLineManager>
      </div> */}
    </div>
  );
}
