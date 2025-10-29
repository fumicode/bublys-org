'use client';
import { WorldLineManager } from '../WorldLine/feature/WorldLineManager';
import { 
  serializeCounter, 
  deserializeCounter,
  createInitialCounter
} from '../Counter/feature/CounterManager';
import { Counter } from '../Counter/domain/Counter';

/**
 * CounterとWorldLineを統合するマネージャーコンポーネント
 * - 1つのCounterに対して1つの独立した世界線を管理
 */
interface CounterWorldLineManagerProps {
  children: React.ReactNode;
  initialValue?: number;
  counterId: string;
}

export function CounterWorldLineManager({ 
  children, 
  initialValue,
  counterId
}: CounterWorldLineManagerProps) {
  return (
    <WorldLineManager<Counter>
      objectId={counterId}
      serialize={serializeCounter}
      deserialize={deserializeCounter}
      createInitialWorldState={() => createInitialCounter(initialValue)}
    >
      {children}
    </WorldLineManager>
  );
}

