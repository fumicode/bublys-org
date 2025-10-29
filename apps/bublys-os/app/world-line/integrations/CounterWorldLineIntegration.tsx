'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { CounterView } from '../Counter/ui/CounterView';
import { Counter } from '../Counter/domain/Counter';

/**
 * CounterとWorldLineの統合層
 */
export function CounterWorldLineIntegration() {
  return (
    <WorldLineView<Counter>
      renderWorldState={(counter: Counter, onCounterChange) => (
        <div>
          <CounterView
            counter={counter}
            onCounterChange={onCounterChange}
          />
        </div>
      )}
    />
  );
}

