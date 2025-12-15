import { Counter } from '../domain/Counter';

/**
 * Counterのシリアライズ
 */
export function serializeCounter(counter: Counter): any {
  return counter.toJson();
}

/**
 * Counterのデシリアライズ
 */
export function deserializeCounter(data: any): Counter {
  return Counter.fromJson(data);
}

/**
 * Counterの初期状態を作成
 */
export function createInitialCounter(id: string, initialValue: number = 0): Counter {
  return new Counter(id, initialValue);
}
