'use client';
import { WorldLineManager } from '../WorldLine/feature/WorldLineManager';
import { 
  serializeCounter, 
  deserializeCounter,
  createInitialCounter
} from '../Counter/feature/CounterManager';
import { Counter } from '../../counter/Counter';

/**
 * CounterとWorldLineを統合するマネージャーコンポーネント
 * - 1つのCounterに対して1つの独立した世界線を管理
 */
interface CounterWorldLineManagerProps {
  children: React.ReactNode;
  initialValue?: number;
  counterId: string;
  isBubbleMode?: boolean;
  onOpenWorldLineView?: () => void;
  onCloseWorldLineView?: () => void;
}

export function CounterWorldLineManager({
  children,
  initialValue,
  counterId,
  isBubbleMode = false,
  onOpenWorldLineView,
  onCloseWorldLineView
}: CounterWorldLineManagerProps) {
  return (
    <WorldLineManager<Counter>
      objectId={counterId}
      serialize={serializeCounter}
      deserialize={deserializeCounter}
      createInitialWorldState={() => createInitialCounter(counterId, initialValue)}
      isBubbleMode={isBubbleMode}
      onOpenWorldLineView={onOpenWorldLineView}
      onCloseWorldLineView={onCloseWorldLineView}
    >
      {children}
    </WorldLineManager>
  );
}

