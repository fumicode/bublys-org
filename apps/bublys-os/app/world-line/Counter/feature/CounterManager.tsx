import { Counter } from '../domain/Counter';

/**
 * Counter用のWorldState型定義
 */
export interface CounterWorldState {
  counters: Map<string, Counter>;
}

/**
 * CounterWorldStateのシリアライズ
 */
export function serializeCounterWorldState(state: CounterWorldState): any {
  return {
    counters: Array.from(state.counters.entries()).map(([id, counter]) => ({
      id,
      counter: counter.toJson()
    })),
  };
}

/**
 * CounterWorldStateのデシリアライズ
 */
export function deserializeCounterWorldState(data: any): CounterWorldState {
  const counters = new Map<string, Counter>();
  
  if (data?.counters && Array.isArray(data.counters)) {
    for (const { id, counter } of data.counters) {
      counters.set(id, Counter.fromJson(counter));
    }
  }
  
  return { counters };
}

/**
 * Counter用の初期WorldStateを作成
 */
export function createInitialCounterWorldState(): CounterWorldState {
  const initialCounters = new Map<string, Counter>([
    ['counter-1', new Counter(100)],
    ['counter-2', new Counter(200)]
  ]);
  
  return { counters: initialCounters };
}

