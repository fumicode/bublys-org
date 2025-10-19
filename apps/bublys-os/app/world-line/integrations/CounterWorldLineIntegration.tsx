'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { CounterView } from '../Counter/ui/CounterView';
import { Counter } from '../Counter/domain/Counter';

/**
 * CounterとWorldLineの統合層
 */
interface CounterWorldLineIntegrationProps {
  counterId: string;
}

export function CounterWorldLineIntegration({ counterId }: CounterWorldLineIntegrationProps) {
  return (
    <WorldLineView<Counter>
      renderWorldState={(counter: Counter, onCounterChange) => (
        <div>
          <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.5rem' }}>
            Counter ID: {counterId}
          </div>
          <CounterView
            counter={counter}
            onCounterChange={onCounterChange}
          />
        </div>
      )}
    />
  );
}

