import { BaseBubly, BublyRegistry } from './BaseBubly';
import { Counter } from '../Counter/domain/Counter';

/**
 * Counterバブリクラス
 */
export class CounterBubly implements BaseBubly {
  public readonly type = 'counter';
  public readonly id: string;
  public readonly counter: Counter;
  
  constructor(id: string, counter: Counter) {
    this.id = id;
    this.counter = counter;
  }
  
  /**
   * カウンターを更新（新しいインスタンスを返す）
   */
  updateCounter(newCounter: Counter): CounterBubly {
    return new CounterBubly(this.id, newCounter);
  }
  
  /**
   * JSON形式に変換
   */
  toJson(): any {
    return {
      type: this.type,
      id: this.id,
      counter: this.counter.toJson(),
    };
  }
  
  /**
   * JSONからCounterBublyインスタンスを作成
   */
  static fromJson(json: any): CounterBubly {
    const counter = Counter.fromJson(json.counter);
    return new CounterBubly(json.id, counter);
  }
}

// CounterBublyをレジストリーに登録
BublyRegistry.register('counter', (json) => CounterBubly.fromJson(json));

