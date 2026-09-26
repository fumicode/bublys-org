'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { CounterView } from '../Counter/ui/CounterView';
import { Counter } from '../../counter/Counter';
import { useFocusedObject } from "@bublys-org/bubbles-ui";

/**
 * CounterとWorldLineの統合層
 */
export function CounterWorldLineIntegration({ counterId }: { counterId: string }) {
  const { setFocusedObjectId } = useFocusedObject();
  
  return (
    <WorldLineView<Counter>
      renderWorldState={(counter: Counter, onCounterChange) => (
        <div
          onFocus={() => setFocusedObjectId(counterId)}
          onMouseDown={() => setFocusedObjectId(counterId)}
          tabIndex={-1}
        >
          <CounterView
            counter={counter}
            onCounterChange={onCounterChange}
            counterId={counterId}
          />
        </div>
      )}
    />
  );
}

