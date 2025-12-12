'use client';
import { createWorldLineManager } from '../WorldLine/feature/createWorldLineManager';
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

const CounterWorldLineManagerBase = createWorldLineManager<Counter>({
  serialize: serializeCounter,
  deserialize: deserializeCounter,
  createInitialWorldState: () => createInitialCounter(),
});

export function CounterWorldLineManager({
  children,
  initialValue,
  counterId
}: CounterWorldLineManagerProps) {
  return (
    <CounterWorldLineManagerBase
      objectId={counterId}
      // 初期値だけ個別に渡す
      createInitialWorldState={() => createInitialCounter(initialValue)}
    >
      {children}
    </CounterWorldLineManagerBase>
  );
}

