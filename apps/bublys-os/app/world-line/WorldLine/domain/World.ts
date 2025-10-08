import { Counter } from './Counter';

/**
 * World クラス
 * 各世界の状態を管理する
 */
export class World {
  public readonly worldId: string;
  public readonly counter: Counter;

  constructor(worldId: string, counter: Counter = new Counter()) {
    this.worldId = worldId;
    this.counter = counter;
  }

  /**
   * カウンターを更新した新しいWorldを作成
   */
  public updateCounter(newCounter: Counter): World {
    return new World(this.worldId, newCounter);
  }

  /**
   * JSON形式に変換
   */
  public toJson(): object {
    return {
      worldId: this.worldId,
      counter: this.counter.toJson(),
    };
  }

  /**
   * JSONからWorldインスタンスを作成
   */
  public static fromJson(json: any): World {
    return new World(
      json.worldId || '',
      Counter.fromJson(json.counter || {})
    );
  }
}